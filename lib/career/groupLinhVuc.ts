import { normalizeNhomHeadingKey } from "@/lib/career/hubRailTheme";
import type { LinhVucRow } from "@/lib/career/types";

export type LinhVucSidebarGroup = {
  id: string;
  /** null = cụm phẳng (mục chưa gán nhóm) */
  heading: string | null;
  /** Giá trị `nhom` gốc từ DB — dùng map icon/màu rail */
  nhomKey: string | null;
  links: LinhVucRow[];
};

/** Tên hiển thị sidebar — ưu tiên tiếng Việt (`ten` / `ten_vi`) */
function tenSortKey(r: LinhVucRow): string {
  return (r.ten_vi ?? r.ten ?? r.ten_en ?? r.slug ?? "").trim();
}

function sortByTenDisplay(a: LinhVucRow, b: LinhVucRow): number {
  const ord = (a.thu_tu ?? 0) - (b.thu_tu ?? 0);
  if (ord !== 0) return ord;
  return tenSortKey(a).localeCompare(tenSortKey(b), "vi", { sensitivity: "base" });
}

/** Khóa gom nhóm — ưu tiên mã `nhom`, không đổi hoa/thường. */
function nhomKey(r: LinhVucRow): string | null {
  const code = r.nhom?.trim();
  if (code) return code;
  const vi = r.nhom_vi?.trim();
  return vi && vi.length > 0 ? vi : null;
}

/** Tiêu đề nhóm sidebar — lấy nguyên văn từ DB (`nhom_vi` / `ten_nhom`). */
function nhomSidebarHeading(links: LinhVucRow[], fallbackKey: string): string {
  const fromDb = links.map((r) => r.nhom_vi?.trim()).find(Boolean);
  if (fromDb) {
    if (/^nh[oô]m\s+ngh[eê]/i.test(fromDb)) return fromDb;
    return `Nhóm nghề ${fromDb}`;
  }
  return formatNhomSidebarHeading(fallbackKey);
}

function stableNhomId(label: string, index: number): string {
  let h = 5381;
  for (let i = 0; i < label.length; i++) {
    h = ((h << 5) + h) ^ label.charCodeAt(i);
  }
  return `nhom-${(h >>> 0).toString(36)}-${index}`;
}

/**
 * Thứ tự cố định nhóm trên career hub sidebar:
 * Design → Film → Illustration → Spatial → Fashion.
 * Nhóm không khớp xếp sau, theo locale `vi`.
 */
function nhomHeadingRank(n: string): number | null {
  const x = normalizeNhomHeadingKey(n);
  if (x === "DESIGN" || x.startsWith("DESIGN_")) return 0;
  if (
    x === "FILM_ANIMATION" ||
    x === "FILM" ||
    x.startsWith("FILM_")
  )
    return 1;
  if (
    x === "ILLUSTRATION_ART" ||
    x === "ILLUSTRATION" ||
    x.startsWith("ILLUSTRATION_")
  )
    return 2;
  if (x === "SPATIAL" || x.startsWith("SPATIAL_")) return 3;
  if (x === "FASHION" || x.startsWith("FASHION_")) return 4;
  return null;
}

function compareNhomHeadings(a: string, b: string): number {
  const ra = nhomHeadingRank(a);
  const rb = nhomHeadingRank(b);
  if (ra !== null && rb !== null) {
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "vi");
  }
  if (ra !== null && rb === null) return -1;
  if (ra === null && rb !== null) return 1;
  return a.localeCompare(b, "vi");
}

const NHOM_HEADING_LABELS: Record<string, string> = {
  DESIGN: "Design",
  FILM_ANIMATION: "Film & Animation",
  FILM: "Film",
  ILLUSTRATION_ART: "Illustration",
  ILLUSTRATION: "Illustration",
  SPATIAL: "Spatial",
  FASHION: "Fashion",
};

/** Tiêu đề accordion sidebar: 「Nhóm nghề Design」, … */
export function formatNhomSidebarHeading(raw: string): string {
  const key = normalizeNhomHeadingKey(raw);
  const known = NHOM_HEADING_LABELS[key];
  if (known) return `Nhóm nghề ${known}`;

  for (const [k, label] of Object.entries(NHOM_HEADING_LABELS)) {
    if (key.startsWith(`${k}_`)) return `Nhóm nghề ${label}`;
  }

  const pretty = raw.trim().replace(/_/g, " ").replace(/\s+/g, " ");
  return pretty ? `Nhóm nghề ${pretty}` : "Nhóm nghề";
}

/**
 * Nhóm lĩnh vực sidebar theo `nhom` / `nhom_vi` (cùng giá trị = cùng tiêu đề nhóm).
 * Mục không có nhóm nằm ở cụm đầu, không tiêu đề.
 */
export function groupLinhVucForSidebar(
  rows: LinhVucRow[],
): LinhVucSidebarGroup[] {
  const valid = rows.filter((r) => (r.slug ?? "").length > 0);
  if (valid.length === 0) return [];

  const ungrouped: LinhVucRow[] = [];
  const byNhom = new Map<string, LinhVucRow[]>();

  for (const r of valid) {
    const key = nhomKey(r);
    if (!key) {
      ungrouped.push(r);
      continue;
    }
    const arr = byNhom.get(key) ?? [];
    arr.push(r);
    byNhom.set(key, arr);
  }

  const out: LinhVucSidebarGroup[] = [];

  if (ungrouped.length > 0) {
    out.push({
      id: "grp-standalone",
      heading: null,
      nhomKey: null,
      links: [...ungrouped].sort(sortByTenDisplay),
    });
  }

  const headings = Array.from(byNhom.keys()).sort(compareNhomHeadings);

  headings.forEach((h, i) => {
    const links = (byNhom.get(h) ?? []).sort(sortByTenDisplay);
    if (links.length === 0) return;
    out.push({
      id: stableNhomId(h, i),
      heading: nhomSidebarHeading(links, h),
      nhomKey: h,
      links,
    });
  });

  return out;
}
