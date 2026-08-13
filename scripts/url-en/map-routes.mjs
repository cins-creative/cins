/**
 * Sinh bảng mapping route cũ → mới từ `dictionary.mjs` + cây route thật.
 *
 *   node scripts/url-en/map-routes.mjs           # báo segment thiếu + thống kê
 *   node scripts/url-en/map-routes.mjs --write   # ghi docs/URL_MAP_GENERATED.md
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import {
  API_TOP, BY_PARENT, KEEP, OVERRIDES, SEGMENTS, TOP,
} from "./dictionary.mjs";

/** Segment động / group route / intercepting route (`(.)p`) — không dịch. */
function isDynamic(seg) {
  return (
    seg.startsWith("[") ||
    seg.startsWith("(") ||
    seg.startsWith("@")
  );
}

/** Path URL từ đường dẫn file trong `app/`. */
export function routePathFromFile(file) {
  const rel = file.replace(/^app\//, "").replace(/\/(page|route|layout)\.tsx?$/, "");
  const segs = rel
    .split("/")
    /* Route group `(public)` và named slot `@modal` không xuất hiện trong URL. */
    .filter((s) => s && !/^\([^)]*\)$/.test(s) && !s.startsWith("@"))
    /* Intercepting route `(.)p` / `(..)p` → segment `p`. */
    .map((s) => s.replace(/^\(\.{1,3}\)/, ""));
  return "/" + segs.join("/");
}

const missing = new Map();

/** Dịch một segment theo context. Trả `{ value, known }`. */
function translateSegment(seg, { index, parent, isApi }) {
  if (isDynamic(seg)) return { value: seg, known: true };

  /* BY_PARENT trước KEEP: `shop` nói chung giữ nguyên, nhưng `/shopping/shop`
   * là tab listing nên thành `shops`. */
  const parentTable = parent ? BY_PARENT[parent] : null;
  if (parentTable && parentTable[seg]) return { value: parentTable[seg], known: true };

  if (KEEP.has(seg)) return { value: seg, known: true };

  const atTop = isApi ? index === 1 : index === 0;
  if (atTop) {
    const table = isApi ? API_TOP : TOP;
    if (table[seg]) return { value: table[seg], known: true };
  }

  if (SEGMENTS[seg]) return { value: SEGMENTS[seg], known: true };

  /* Không có trong từ điển: nếu toàn ASCII không dấu và không giống tiếng Việt
   * thì có thể đã là tiếng Anh — vẫn báo để mình duyệt bằng mắt. */
  if (!missing.has(seg)) missing.set(seg, new Set());
  return { value: seg, known: false };
}

export function translatePath(path) {
  if (Object.prototype.hasOwnProperty.call(OVERRIDES, path)) {
    return { path: OVERRIDES[path], unknown: [] };
  }
  const segs = path.split("/").filter(Boolean);
  const isApi = segs[0] === "api";
  const out = [];
  const unknown = [];
  for (let i = 0; i < segs.length; i += 1) {
    const parent = i > 0 ? segs[i - 1] : null;
    const { value, known } = translateSegment(segs[i], { index: i, parent, isApi });
    if (!known) {
      unknown.push(segs[i]);
      missing.get(segs[i]).add(path);
    }
    out.push(value);
  }
  return { path: "/" + out.join("/"), unknown };
}

/* Chỉ quét + in báo cáo khi chạy trực tiếp; `apply.mjs` import `translatePath`. */
const RUN_DIRECTLY = process.argv[1]?.replace(/\\/g, "/").endsWith("map-routes.mjs");

if (RUN_DIRECTLY) {
const files = execSync('git ls-files "app/**/page.tsx" "app/**/route.ts"', {
  encoding: "utf8",
  maxBuffer: 1 << 26,
})
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => !f.startsWith("app/admin/") && !f.startsWith("app/api/admin/"));

const routes = [...new Set(files.map(routePathFromFile))].sort();

const rows = [];
let changed = 0;
let removed = 0;
for (const r of routes) {
  const { path: next, unknown } = translatePath(r);
  if (next === null) removed += 1;
  else if (next !== r) changed += 1;
  rows.push({ old: r, next, unknown });
}

console.log(`routes: ${routes.length}  changed: ${changed}  removed: ${removed}  unchanged: ${routes.length - changed - removed}`);

if (missing.size > 0) {
  console.log(`\n=== ${missing.size} segment CHƯA CÓ trong từ điển ===`);
  for (const [seg, paths] of [...missing.entries()].sort()) {
    console.log(`  ${seg.padEnd(26)} (${paths.size}x)  vd: ${[...paths][0]}`);
  }
} else {
  console.log("\nTừ điển đã phủ hết segment.");
}

if (process.argv.includes("--write")) {
  const lines = [
    "# Bảng mapping route sinh tự động",
    "",
    "Sinh bởi `scripts/url-en/map-routes.mjs` từ `scripts/url-en/dictionary.mjs`.",
    "**Không sửa tay file này** — sửa từ điển rồi chạy lại.",
    "",
    `Tổng ${routes.length} route · đổi ${changed} · xóa ${removed}.`,
    "",
    "| Route cũ | Route mới |",
    "|---|---|",
  ];
  for (const r of rows) {
    if (r.next === r.old) continue;
    lines.push(`| \`${r.old}\` | ${r.next === null ? "**xóa**" : `\`${r.next}\``} |`);
  }
  writeFileSync("docs/URL_MAP_GENERATED.md", lines.join("\n") + "\n", "utf8");
  console.log("\n→ docs/URL_MAP_GENERATED.md");
}
}
