/**
 * Đóng gói extension → public/downloads/cins-tro-ly.zip
 * Chạy: node scripts/pack-tro-ly-extension.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "extensions", "cins-tro-ly");
const outDir = path.join(root, "public", "downloads");
const outZip = path.join(outDir, "cins-tro-ly.zip");

if (!fs.existsSync(src)) {
  console.error("Missing", src);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const isWin = process.platform === "win32";
if (isWin) {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      // Zip cả folder → entry `cins-tro-ly/manifest.json`
      `Compress-Archive -Path '${src.replace(/'/g, "''")}' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" },
  );
} else {
  execFileSync("zip", ["-r", outZip, "cins-tro-ly"], {
    cwd: path.join(root, "extensions"),
    stdio: "inherit",
  });
}

const st = fs.statSync(outZip);
console.log(`Packed ${outZip} (${st.size} bytes)`);
