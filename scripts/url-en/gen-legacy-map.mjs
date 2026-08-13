/**
 * Sinh `lib/navigation/legacy-url-map.ts` từ `dictionary.mjs`.
 *
 *   node scripts/url-en/gen-legacy-map.mjs
 */
import { writeFileSync } from "node:fs";

import {
  API_TOP, BY_PARENT, KEEP, OVERRIDES, SEGMENTS, TOP,
} from "./dictionary.mjs";

const j = (v) => JSON.stringify(v, null, 2).replace(/\n/g, "\n  ");

/** Chỉ giữ OVERRIDES có đích cụ thể; `null` = route đã xóa, xử lý riêng. */
const overrideEntries = Object.fromEntries(
  Object.entries(OVERRIDES).filter(([, v]) => v !== null),
);
const removedPaths = Object.entries(OVERRIDES)
  .filter(([, v]) => v === null)
  .map(([k]) => k);

const out = `/**
 * Map URL tiếng Việt cũ → URL tiếng Anh hiện tại.
 *
 * SINH TỰ ĐỘNG bởi \`scripts/url-en/gen-legacy-map.mjs\` từ
 * \`scripts/url-en/dictionary.mjs\`. **Không sửa tay** — sửa từ điển rồi chạy lại.
 *
 * Dùng trong \`middleware.ts\` để redirect 308 (giữ method + body nên POST tới
 * \`/api/*\` cũ vẫn đúng). Quyết định giữ vĩnh viễn: \`docs/PLAN_URL_ENGLISH.md\` Q2.
 */

const KEEP = new Set<string>(${j([...KEEP])});

const TOP: Record<string, string> = ${j(TOP)};

const API_TOP: Record<string, string> = ${j(API_TOP)};

const BY_PARENT: Record<string, Record<string, string>> = ${j(BY_PARENT)};

const SEGMENTS: Record<string, string> = ${j(SEGMENTS)};

const OVERRIDES: Record<string, string> = ${j(overrideEntries)};

/** Route đã xóa — điều hướng về đích thay thế. */
const REMOVED: Record<string, string> = {
  "/luoi": "/",
};

/** Route đã xóa có segment động. */
const REMOVED_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  /* Trang trung gian sau khi tạo cộng đồng → vào thẳng trang cộng đồng. */
  [/^\\/(?:cong-dong|community)\\/([^/]+)\\/nhan\\/?$/, "/community/$1"],
];

/** Segment động (\`[id]\`, \`:id\`) — không dịch. */
function isDynamic(seg: string): boolean {
  return seg.startsWith("[") || seg.startsWith(":");
}

function translateSegment(
  seg: string,
  index: number,
  parent: string | null,
  isApi: boolean,
): string {
  if (isDynamic(seg)) return seg;

  const parentTable = parent ? BY_PARENT[parent] : undefined;
  const fromParent = parentTable?.[seg];
  if (fromParent) return fromParent;

  if (KEEP.has(seg)) return seg;

  const atTop = isApi ? index === 1 : index === 0;
  if (atTop) {
    const fromTop = (isApi ? API_TOP : TOP)[seg];
    if (fromTop) return fromTop;
  }

  return SEGMENTS[seg] ?? seg;
}

/**
 * Path mới cho một pathname cũ, hoặc \`null\` khi đã đúng chuẩn tiếng Anh.
 *
 * Idempotent: gọi lại trên path đã dịch trả \`null\` (tên tiếng Anh không nằm
 * trong bảng tra), nên an toàn khi middleware chạy nhiều lần.
 */
export function rewriteLegacyPath(pathname: string): string | null {
  const removed = REMOVED[pathname];
  if (removed) return removed;

  for (const [pattern, target] of REMOVED_PATTERNS) {
    if (pattern.test(pathname)) return pathname.replace(pattern, target);
  }

  const override = OVERRIDES[pathname];
  if (override) return override;

  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;

  const isApi = segs[0] === "api";
  /* \`/admin/*\` giữ tiếng Việt — ngoài phạm vi. */
  if (segs[0] === "admin" || (isApi && segs[1] === "admin")) return null;

  let changed = false;
  const out = segs.map((seg, i) => {
    const next = translateSegment(seg, i, i > 0 ? segs[i - 1] : null, isApi);
    if (next !== seg) changed = true;
    return next;
  });
  if (!changed) return null;

  const trailing = pathname.endsWith("/") && pathname !== "/" ? "/" : "";
  return \`/\${out.join("/")}\${trailing}\`;
}

/** Param query đã đổi tên. */
const QUERY_PARAM_RENAMES: Record<string, string> = {
  nhom: "group",
  mau: "variant",
};

/** Giá trị query đã đổi (\`?display=luoi\` → \`?display=grid\`). */
const QUERY_VALUE_RENAMES: Record<string, Record<string, string>> = {
  display: { luoi: "grid" },
};

/** Query string mới, hoặc \`null\` khi không có gì đổi. */
export function rewriteLegacyQuery(params: URLSearchParams): string | null {
  let changed = false;
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    const nextKey = QUERY_PARAM_RENAMES[key] ?? key;
    const nextValue = QUERY_VALUE_RENAMES[nextKey]?.[value] ?? value;
    if (nextKey !== key || nextValue !== value) changed = true;
    next.append(nextKey, nextValue);
  }
  return changed ? next.toString() : null;
}
`;

writeFileSync("lib/navigation/legacy-url-map.ts", out, "utf8");
console.log("→ lib/navigation/legacy-url-map.ts");
console.log("route da xoa (can dich thu cong trong REMOVED):", removedPaths.join(", "));
