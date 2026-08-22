/**
 * Park route theo bề mặt → OpenNext build/deploy → luôn restore `app/`.
 *
 *   node scripts/deploy-surface.mjs web
 *   node scripts/deploy-surface.mjs manage
 */
import { spawnSync } from "node:child_process";

import { parkManage, parkWeb, restore } from "./cins-surface.mjs";

const surface = process.argv[2];
if (surface !== "web" && surface !== "manage") {
  console.error("Usage: node scripts/deploy-surface.mjs <web|manage>");
  process.exit(1);
}

process.env.CINS_SURFACE = surface;

if (surface === "manage") {
  process.env.NEXT_PUBLIC_SITE_URL = "https://manage.cins.vn";
}

const wranglerExtra =
  surface === "manage" ? " --config wrangler.manage.jsonc" : "";

const command = `node scripts/ensure-prod-site-url.mjs "opennextjs-cloudflare build && opennextjs-cloudflare deploy -- --keep-vars${wranglerExtra}"`;

let parkOk = false;
try {
  if (surface === "web") parkWeb();
  else parkManage();
  parkOk = true;
  console.log(`[surface] parked for ${surface}`);

  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  process.exitCode = result.status ?? 1;
} catch (err) {
  console.error("[surface] failed:", err);
  process.exitCode = 1;
} finally {
  if (parkOk) {
    try {
      restore();
      console.log("[surface] restored app/");
    } catch (restoreErr) {
      console.error(
        "[surface] RESTORE FAILED — chạy: node scripts/cins-surface.mjs restore",
        restoreErr,
      );
    }
  }
}
