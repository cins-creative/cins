import type { LinhVucRow } from "@/lib/career/types";

export type LinhVucSidebarGroup = {
  id: string;
  /** null = cụm phẳng (mục chưa gán nhóm) */
  heading: string | null;
  links: LinhVucRow[];
};

/** Thứ tự hiển thị theo tên tiếng Anh (fallback tiếng Việt) */
function sortByDisplayEn(a: LinhVucRow, b: LinhVucRow): number {
  return (a.ten_en ?? a.ten_vi ?? "").localeCompare(
    b.ten_en ?? b.ten_vi ?? "",
    "en",
    { sensitivity: "base" },
  );
}

function stableNhomId(label: string, index: number): string {
  let h = 5381;
  for (let i = 0; i < label.length; i++) {
    h = ((h << 5) + h) ^ label.charCodeAt(i);
  }
  return `nhom-${(h >>> 0).toString(36)}-${index}`;
}

/**
 * Nhóm lĩnh vực sidebar theo `lv_linh_vuc.nhom_vi` (cùng giá trị = cùng tiêu đề nhóm).
 * Mục không có `nhom_vi` nằm ở cụm đầu, không tiêu đề.
 */
export function groupLinhVucForSidebar(
  rows: LinhVucRow[],
): LinhVucSidebarGroup[] {
  const valid = rows.filter((r) => (r.slug ?? "").length > 0);
  if (valid.length === 0) return [];

  const ungrouped: LinhVucRow[] = [];
  const byNhom = new Map<string, LinhVucRow[]>();

  for (const r of valid) {
    const key = r.nhom_vi?.trim();
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
      links: [...ungrouped].sort(sortByDisplayEn),
    });
  }

  const headings = Array.from(byNhom.keys()).sort((a, b) =>
    a.localeCompare(b, "vi"),
  );

  headings.forEach((h, i) => {
    const links = (byNhom.get(h) ?? []).sort(sortByDisplayEn);
    if (links.length === 0) return;
    out.push({
      id: stableNhomId(h, i),
      heading: h,
      links,
    });
  });

  return out;
}
