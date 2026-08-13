/**
 * Sửa import specifier `@/app/<path>` sau khi đổi tên folder route.
 *
 *   node scripts/url-en/fix-app-imports.mjs          # dry-run
 *   node scripts/url-en/fix-app-imports.mjs --write
 *
 * Chỉ dịch phần **thư mục**; tên file cuối (kể cả `.css`) giữ nguyên.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { translatePath } from "./map-routes.mjs";

const WRITE = process.argv.includes("--write");

const files = execSync("git ls-files", { encoding: "utf8", maxBuffer: 1 << 28 })
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => /\.(ts|tsx|js|jsx|mjs|css)$/.test(f))
  .filter((f) => !f.startsWith("scripts/") && !f.startsWith("docs/"));

/** Thư mục đang tồn tại trong `app/` — nguồn kiểm chứng, tránh dịch sai. */
const existingDirs = new Set();
for (const f of execSync('git ls-files "app/**"', { encoding: "utf8", maxBuffer: 1 << 28 })
  .split("\n")
  .filter(Boolean)) {
  const parts = f.split("/");
  for (let i = 1; i < parts.length; i += 1) existingDirs.add(parts.slice(0, i).join("/"));
}

/**
 * `@/app/co-so/co-so-page.css` → `@/app/academy/co-so-page.css`.
 *
 * Chỉ đổi khi thư mục cũ **đã biến mất** và thư mục mới **có thật** —
 * `app/nganh` (chỉ chứa server action, không phải route) vì thế được giữ nguyên.
 */
function translateAppSpecifier(rest) {
  const segs = rest.split("/");
  if (segs.length < 2) return rest;
  const leaf = segs.at(-1);
  const dir = "/" + segs.slice(0, -1).join("/");
  const { path: next } = translatePath(dir);
  if (next === null || next === dir) return rest;

  if (existingDirs.has(`app${dir}`)) return rest;
  if (!existingDirs.has(`app${next}`)) return rest;
  return `${next.slice(1)}/${leaf}`;
}

let changedFiles = 0;
let changedRefs = 0;

for (const file of files) {
  const before = readFileSync(file, "utf8");
  const seen = [];
  const after = before.replace(/@\/app\/([A-Za-z0-9\-_./[\]()@]+)/g, (whole, rest) => {
    const next = translateAppSpecifier(rest);
    if (next === rest) return whole;
    seen.push([`@/app/${rest}`, `@/app/${next}`]);
    return `@/app/${next}`;
  });
  if (after === before) continue;
  changedFiles += 1;
  changedRefs += seen.length;
  console.log(`\n${file}`);
  for (const [a, b] of new Map(seen)) console.log(`  ${a}\n    -> ${b}`);
  if (WRITE) writeFileSync(file, after, "utf8");
}

console.log(`\n${changedRefs} specifier trong ${changedFiles} file${WRITE ? " (da ghi)" : " (dry-run)"}`);
