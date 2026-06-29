/**
 * Mirror the DB-referenced OLD Cloudflare images into the NEW account.
 *
 * Cloudflare refuses custom ids that look like UUIDs, so the new account
 * assigns fresh uuids. We therefore record an old->new id map for the DB rewrite.
 *
 * Input : referenced-ids.json (from extract-referenced-ids.mjs)
 * Output: id-map.json  { oldId: newId, ... }  (resumable — skips mapped ids)
 *         failures are logged to mirror-failures.log
 *
 * Usage:
 *   node scripts/cf-migrate/mirror.mjs --limit 10      # dry run on 10 ids
 *   node scripts/cf-migrate/mirror.mjs                # all referenced ids
 *   node scripts/cf-migrate/mirror.mjs --concurrency 16
 */
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  cfDownloadBlob,
  downloadImageBlob,
  uploadImageWithId,
} from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_PATH = path.join(__dirname, "referenced-ids.json");
const MAP_PATH = path.join(__dirname, "id-map.json");
const FAIL_PATH = path.join(__dirname, "mirror-failures.log");

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const limit = Number(getArg("limit", "0")) || 0;
const concurrency = Number(getArg("concurrency", "12")) || 12;

const cfg = loadConfig();

if (!existsSync(REF_PATH)) {
  console.error("Missing referenced-ids.json — run extract-referenced-ids.mjs first.");
  process.exit(1);
}
const { ids: refIds } = JSON.parse(readFileSync(REF_PATH, "utf8"));

const idMap = existsSync(MAP_PATH)
  ? JSON.parse(readFileSync(MAP_PATH, "utf8"))
  : {};

let pending = refIds.filter((id) => !idMap[id]);
if (limit) pending = pending.slice(0, limit);

console.log(`Referenced ids: ${refIds.length}. Already mapped: ${Object.keys(idMap).length}. Pending this run: ${pending.length}.`);

let processed = 0;
let saveCounter = 0;
function persistMap() {
  writeFileSync(MAP_PATH, JSON.stringify(idMap, null, 0));
}

async function withRetry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fn();
      if (r && r.ok !== false) return r;
      last = r;
    } catch (err) {
      last = { ok: false, error: String(err?.message ?? err) };
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return last;
}

async function mirrorOne(oldId) {
  let dl = await withRetry(() => cfDownloadBlob(cfg.old, oldId));
  if (!dl.ok) {
    dl = await withRetry(() =>
      downloadImageBlob(cfg.old.hash, oldId, ["public", "full", "thumbnail"]),
    );
  }
  if (!dl.ok) {
    return { ok: false, oldId, stage: "download", error: dl.error };
  }
  const up = await withRetry(() =>
    uploadImageWithId(cfg.new, undefined, dl.bytes, dl.contentType, {
      migrated_from: oldId,
    }),
  );
  if (!up.ok || !up.result?.id) {
    return { ok: false, oldId, stage: "upload", error: up.error || "no id" };
  }
  return { ok: true, oldId, newId: up.result.id };
}

async function runPool(items, worker, size) {
  let idx = 0;
  let active = 0;
  const counters = { uploaded: 0, failed: 0 };
  return new Promise((resolve) => {
    const next = () => {
      if (idx >= items.length && active === 0) return resolve(counters);
      while (active < size && idx < items.length) {
        const oldId = items[idx++];
        active++;
        worker(oldId)
          .then((res) => {
            processed++;
            if (res.ok) {
              idMap[res.oldId] = res.newId;
              counters.uploaded++;
            } else {
              counters.failed++;
              appendFileSync(
                FAIL_PATH,
                JSON.stringify({ ...res, at: new Date().toISOString() }) + "\n",
              );
              console.log(`FAIL ${res.oldId} [${res.stage}]: ${res.error}`);
            }
            if (++saveCounter % 25 === 0) persistMap();
            if (processed % 50 === 0) {
              console.log(`[${processed}/${items.length}] uploaded=${counters.uploaded} failed=${counters.failed}`);
            }
          })
          .finally(() => {
            active--;
            next();
          });
      }
    };
    next();
  });
}

const t0 = Date.now();
const counters = await runPool(pending, mirrorOne, concurrency);
persistMap();
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log("\n== Mirror done ==");
console.log("Elapsed:", secs, "s");
console.log("Uploaded:", counters.uploaded, "Failed:", counters.failed);
console.log("Total mapped now:", Object.keys(idMap).length, "/", refIds.length);
if (counters.failed) console.log("See mirror-failures.log for details.");
