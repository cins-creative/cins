/**
 * Chuẩn hoá env rồi chạy lệnh build/deploy/preview (cùng process.env).
 *
 * 1) Ép NEXT_PUBLIC_SITE_URL production — Next ưu tiên env hơn .env.local,
 *    tránh bundle Workers với localhost khi máy dev trỏ :3001.
 * 2) Nạp CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE từ
 *    `.dev.vars` / `.env.local` / `DATABASE_URL` vào process.env.
 *    Wrangler 4 + OpenNext `getPlatformProxy` bắt buộc biến này trên process
 *    (chỉ có trong file `.dev.vars` chưa đủ trên Windows).
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PRODUCTION_SITE_URL = "https://cins.vn";
const HYPERDRIVE_ENV = "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE";
const LEGACY_HYPERDRIVE_ENV =
  "WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE";

function isDevSiteHost(hostname) {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h)
  );
}

function ensureProductionSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    process.env.NEXT_PUBLIC_SITE_URL = PRODUCTION_SITE_URL;
    return;
  }
  try {
    const parsed = new URL(raw);
    if (isDevSiteHost(parsed.hostname)) {
      process.env.NEXT_PUBLIC_SITE_URL = PRODUCTION_SITE_URL;
      return;
    }
    // Ép https cho apex production (tránh http://cins.vn trong bundle).
    if (
      parsed.hostname.toLowerCase().replace(/^www\./, "") === "cins.vn" &&
      parsed.protocol !== "https:"
    ) {
      process.env.NEXT_PUBLIC_SITE_URL = PRODUCTION_SITE_URL;
    }
  } catch {
    process.env.NEXT_PUBLIC_SITE_URL = PRODUCTION_SITE_URL;
  }
}

/** Parse KEY=VALUE từ .env / .dev.vars — không override biến đã có trong process.env. */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key]?.trim()) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
  }
}

function ensureHyperdriveLocalConnectionString() {
  const root = process.cwd();
  /* .dev.vars trước — đúng chỗ Wrangler local; rồi .env.local. */
  loadEnvFile(path.join(root, ".dev.vars"));
  loadEnvFile(path.join(root, ".env.local"));

  const existing = process.env[HYPERDRIVE_ENV]?.trim();
  if (existing) return "process/file";

  const legacy = process.env[LEGACY_HYPERDRIVE_ENV]?.trim();
  if (legacy) {
    process.env[HYPERDRIVE_ENV] = legacy;
    return "legacy-wrangler-name";
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    process.env[HYPERDRIVE_ENV] = databaseUrl;
    return "DATABASE_URL";
  }

  return null;
}

const rest = process.argv.slice(2).join(" ").trim();
if (!rest) {
  console.error("Usage: node scripts/ensure-prod-site-url.mjs <shell command>");
  process.exit(1);
}

ensureProductionSiteUrl();
const hyperdriveSource = ensureHyperdriveLocalConnectionString();
console.log(`[deploy] NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL}`);
if (hyperdriveSource) {
  console.log(
    `[deploy] ${HYPERDRIVE_ENV} ready (from ${hyperdriveSource})`,
  );
} else {
  console.error(
    `[deploy] Thiếu ${HYPERDRIVE_ENV}.\n` +
      `  Thêm vào .dev.vars (gitignore) cùng giá trị DATABASE_URL Postgres, ví dụ:\n` +
      `  ${HYPERDRIVE_ENV}=postgresql://...\n` +
      `  Hoặc export biến đó / DATABASE_URL trước khi npm run deploy.`,
  );
  process.exit(1);
}

const result = spawnSync(rest, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
