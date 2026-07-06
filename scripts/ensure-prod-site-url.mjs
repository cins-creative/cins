/**
 * Ép NEXT_PUBLIC_SITE_URL production rồi chạy lệnh build/deploy (cùng env).
 *
 * Vì Next.js ưu tiên biến môi trường hơn .env.local — tránh bundle Workers
 * với localhost khi máy dev có `.env.local` trỏ :3001.
 */
import { spawnSync } from "node:child_process";

const PRODUCTION_SITE_URL = "https://cins.vn";

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

ensureProductionSiteUrl();
console.log(`[deploy] NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL}`);

const result = spawnSync(rest, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
