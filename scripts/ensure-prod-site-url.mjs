/**
 * Ép NEXT_PUBLIC_SITE_URL production rồi chạy lệnh build/deploy (cùng env).
 *
 * Vì Next.js ưu tiên biến môi trường hơn .env.local — tránh bundle Workers
 * với localhost khi máy dev có `.env.local` trỏ :3001.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_SITE_URL = "https://cins.vn";

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

const rest = process.argv.slice(2).join(" ").trim();
if (!rest) {
  console.error("Usage: node scripts/ensure-prod-site-url.mjs <shell command>");
  process.exit(1);
}

loadMissingFromEnvFiles();
ensureProductionSiteUrl();
console.log(`[deploy] NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL}`);

/* OpenNext/wrangler yêu cầu Hyperdrive local string kể cả khi deploy remote. */
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
  console.error(
    "[deploy] Thiếu CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE (hoặc DATABASE_URL trong .env.local).",
  );
  process.exit(1);
}

const result = spawnSync(rest, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
