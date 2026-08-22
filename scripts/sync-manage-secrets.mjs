/**
 * Ghi secret lên worker `cins-manage` từ .env.local — không in giá trị.
 * Worker phải đã tồn tại (sau deploy:manage lần đầu).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const NAMES = [
  "CINS_ORG_DELEGATION_PASSWORD",
  "CLOUDFLARE_IMAGES_API_TOKEN",
  "CLOUDFLARE_STREAM_API_TOKEN",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "RESEND_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnvLocal();
let ok = 0;
let skip = 0;
for (const name of NAMES) {
  const value = env[name]?.trim();
  if (!value) {
    console.log(`skip ${name} (không có trong .env.local)`);
    skip += 1;
    continue;
  }
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "put", name, "--name", "cins-manage"],
    { input: value, encoding: "utf8", shell: true },
  );
  if (result.status === 0) {
    console.log(`ok ${name}`);
    ok += 1;
  } else {
    console.error(`fail ${name} (exit ${result.status})`);
    process.exitCode = 1;
  }
}
console.log(`xong: ${ok} ghi, ${skip} bỏ qua`);
