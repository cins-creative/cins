/**
 * Ép NEXT_PUBLIC_SITE_URL = https://trung.cins.vn rồi chạy build/deploy nhánh Trung.
 * Guardrail: từ chối nếu wrangler config không phải worker `trung-cins`
 * hoặc route đụng cins.vn / www.cins.vn.
 *
 * KHÔNG dùng cho production worker `cins` — dùng ensure-prod-site-url.mjs.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TRUNG_SITE_URL = "https://trung.cins.vn";
const TRUNG_WORKER = "trung-cins";
const TRUNG_HOST = "trung.cins.vn";
const WRANGLER_TRUNG = "wrangler.trung.jsonc";

function fail(msg) {
  console.error(`[deploy:trung] ${msg}`);
  process.exit(1);
}

/** Nạp key còn thiếu từ .env.local / .dev.vars — không ghi đè biến shell. */
function loadMissingFromEnvFiles() {
  for (const name of [".env.local", ".dev.vars"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key]?.trim()) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function assertTrungWrangler() {
  const path = resolve(process.cwd(), WRANGLER_TRUNG);
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(`Thiếu ${WRANGLER_TRUNG}`);
  }
  const jsonish = raw.replace(/^\s*\/\/.*$/gm, "");
  let cfg;
  try {
    cfg = JSON.parse(jsonish);
  } catch (e) {
    fail(`Không parse được ${WRANGLER_TRUNG}: ${e.message}`);
  }
  if (cfg.name !== TRUNG_WORKER) {
    fail(
      `Worker name phải là "${TRUNG_WORKER}" (got "${cfg.name}") — từ chối deploy.`,
    );
  }
  const patterns = (cfg.routes ?? []).map((r) => r.pattern);
  if (!patterns.includes(TRUNG_HOST)) {
    fail(`routes phải gồm "${TRUNG_HOST}"`);
  }
  for (const p of patterns) {
    if (p === "cins.vn" || p === "www.cins.vn") {
      fail(`Cấm route production "${p}" trong ${WRANGLER_TRUNG}`);
    }
  }
}

function ensureTrungSiteUrl() {
  process.env.NEXT_PUBLIC_SITE_URL = TRUNG_SITE_URL;
  let host = "";
  try {
    host = new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname.toLowerCase();
  } catch {
    fail(`NEXT_PUBLIC_SITE_URL không hợp lệ`);
  }
  if (host !== TRUNG_HOST) {
    fail(`NEXT_PUBLIC_SITE_URL phải là ${TRUNG_SITE_URL} (got host "${host}")`);
  }
}

function ensureHyperdriveLocal() {
  if (
    !process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE?.trim() &&
    process.env.DATABASE_URL?.trim()
  ) {
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE =
      process.env.DATABASE_URL.trim();
  }
  if (
    !process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE?.trim() &&
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE?.trim()
  ) {
    process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE =
      process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE.trim();
  }
  if (
    !process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE?.trim()
  ) {
    fail(
      "Thiếu CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE (hoặc DATABASE_URL trong .env.local).",
    );
  }
}

const rest = process.argv.slice(2).join(" ").trim();
if (!rest) {
  console.error(
    'Usage: node scripts/ensure-trung-site-url.mjs "<shell command>"',
  );
  process.exit(1);
}

loadMissingFromEnvFiles();
assertTrungWrangler();
ensureTrungSiteUrl();
ensureHyperdriveLocal();
console.log(
  `[deploy:trung] NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL} worker=${TRUNG_WORKER}`,
);

const result = spawnSync(rest, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
