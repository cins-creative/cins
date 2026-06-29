/**
 * Find which OLD Cloudflare image ids are actually referenced in the CINS DB.
 *
 * 1. Enumerate every image id in the OLD account (cached to old-ids.json).
 * 2. Scan every text/varchar/jsonb column in the public schema, extract all
 *    UUID-shaped tokens.
 * 3. A token is a real CINS image reference iff it exists in the OLD account.
 *
 * Outputs:
 *   - old-ids.json          : array of all ids in the old account
 *   - referenced-ids.json    : { ids: [...], locations: { id: [{table,column}] } }
 *
 * Read-only. Usage: node scripts/cf-migrate/extract-referenced-ids.mjs [--refresh-old]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadConfig, cfListImages } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLD_IDS_PATH = path.join(__dirname, "old-ids.json");
const REF_PATH = path.join(__dirname, "referenced-ids.json");

const refreshOld = process.argv.includes("--refresh-old");
const cfg = loadConfig();

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

async function getOldIds() {
  if (!refreshOld && existsSync(OLD_IDS_PATH)) {
    const cached = JSON.parse(readFileSync(OLD_IDS_PATH, "utf8"));
    console.log(`Loaded ${cached.length} old ids from cache.`);
    return new Set(cached);
  }
  console.log("Enumerating OLD account images via API…");
  const perPage = 100;
  const ids = [];
  for (let page = 1; ; page++) {
    const res = await cfListImages(cfg.old, { page, perPage });
    const imgs = res.images ?? [];
    if (imgs.length === 0) break;
    for (const img of imgs) ids.push(img.id);
    if (page % 20 === 0) console.log(`  …${ids.length} ids so far`);
    if (imgs.length < perPage) break;
  }
  writeFileSync(OLD_IDS_PATH, JSON.stringify(ids, null, 0));
  console.log(`Enumerated & cached ${ids.length} old ids.`);
  return new Set(ids);
}

const oldIdSet = await getOldIds();

const sql = postgres(cfg.databaseUrl, { max: 1 });
try {
  const cols = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text','character varying','jsonb','json','character')
    ORDER BY table_name, column_name
  `;

  const locations = {}; // oldId -> Set("table.column")
  const candidateTotal = new Set();

  for (const col of cols) {
    let rows;
    try {
      rows = await sql`
        SELECT ${sql(col.column_name)}::text AS v
        FROM ${sql(col.table_name)}
        WHERE ${sql(col.column_name)} IS NOT NULL
          AND ${sql(col.column_name)}::text ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
      `;
    } catch {
      continue;
    }
    for (const row of rows) {
      const matches = row.v.match(UUID_RE);
      if (!matches) continue;
      for (const raw of matches) {
        const id = raw.toLowerCase();
        candidateTotal.add(id);
        if (oldIdSet.has(id)) {
          const key = `${col.table_name}.${col.column_name}`;
          (locations[id] ??= new Set()).add(key);
        }
      }
    }
  }

  const ids = Object.keys(locations);
  const locOut = {};
  const colCounts = {};
  for (const id of ids) {
    locOut[id] = [...locations[id]];
    for (const k of locations[id]) colCounts[k] = (colCounts[k] || 0) + 1;
  }

  writeFileSync(REF_PATH, JSON.stringify({ ids, locations: locOut }, null, 0));

  console.log("");
  console.log(`Distinct UUID tokens found in DB:        ${candidateTotal.size}`);
  console.log(`…of which exist in OLD account (to mirror): ${ids.length}`);
  console.log("");
  console.log("Referenced ids per column:");
  for (const [k, n] of Object.entries(colCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`);
  }
  console.log("");
  console.log(`Wrote ${REF_PATH}`);
} finally {
  await sql.end({ timeout: 5 });
}
