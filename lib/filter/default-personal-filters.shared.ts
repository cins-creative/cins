import type { PersonalFilter } from "@/lib/filter/types";

/** Định nghĩa nhãn hệ thống — seed idempotent, không tính vào giới hạn 5 nhãn tùy chỉnh. */
export type DefaultPersonalFilterDef = {
  slug: string;
  ten: string;
  mau: string;
  thuTu: number;
};

export const DEFAULT_PERSONAL_FILTER_DEFS: readonly DefaultPersonalFilterDef[] = [
  { slug: "hoc", ten: "Học tập", mau: "#1F74C9", thuTu: -50 },
  { slug: "lam", ten: "Công việc", mau: "#0D9488", thuTu: -40 },
  { slug: "du-an", ten: "Dự án", mau: "#EA580C", thuTu: -30 },
  { slug: "ca-nhan", ten: "Cá nhân", mau: "#64748B", thuTu: -20 },
  { slug: "cong-dong", ten: "Cộng đồng", mau: "#1F74C9", thuTu: -10 },
] as const;

export const SYSTEM_PERSONAL_FILTER_SLUGS = new Set(
  DEFAULT_PERSONAL_FILTER_DEFS.map((def) => def.slug),
);

/**
 * Nhãn hệ thống trùng tên «Loại cột mốc» — ẩn khi cùng menu đã liệt kê loại,
 * tránh duplicate Học tập / Công việc / …
 */
export const TYPE_MIRROR_PERSONAL_FILTER_SLUGS = new Set([
  "hoc",
  "lam",
  "du-an",
  "ca-nhan",
]);

export const CONG_DONG_PERSONAL_FILTER_SLUG = "cong-dong";
export const CONG_DONG_PERSONAL_FILTER_TEN = "Cộng đồng";
export const CONG_DONG_PERSONAL_FILTER_MAU = "#1F74C9";

export function isSystemPersonalFilterSlug(slug: string): boolean {
  return SYSTEM_PERSONAL_FILTER_SLUGS.has(slug);
}

/** Nhãn hệ thống trùng slug loại cột mốc (không gồm cộng đồng). */
export function isTypeMirrorPersonalFilterSlug(slug: string): boolean {
  return TYPE_MIRROR_PERSONAL_FILTER_SLUGS.has(slug);
}

/** @deprecated Dùng {@link isSystemPersonalFilterSlug}. */
export function isHiddenPersonalFilterSlug(slug: string): boolean {
  return isSystemPersonalFilterSlug(slug);
}

export function defaultPersonalFilterFallback(
  def: DefaultPersonalFilterDef,
  count = 0,
): PersonalFilter {
  return {
    id: `system-${def.slug}`,
    ten: def.ten,
    slug: def.slug,
    mau: def.mau,
    thuTu: def.thuTu,
    count,
  };
}

/** @deprecated Dùng {@link defaultPersonalFilterFallback}. */
export function congDongPersonalFilterFallback(count = 0): PersonalFilter {
  const def = DEFAULT_PERSONAL_FILTER_DEFS.find(
    (d) => d.slug === CONG_DONG_PERSONAL_FILTER_SLUG,
  )!;
  return defaultPersonalFilterFallback(def, count);
}

export function countUserPersonalFilters<
  T extends { slug: string },
>(filters: ReadonlyArray<T>): number {
  return filters.filter((f) => !isSystemPersonalFilterSlug(f.slug)).length;
}

function sortSystemFiltersFirst(list: PersonalFilter[]): PersonalFilter[] {
  const systemOrder = new Map(
    DEFAULT_PERSONAL_FILTER_DEFS.map((def, index) => [def.slug, index]),
  );
  return [...list].sort((a, b) => {
    const aSys = systemOrder.get(a.slug);
    const bSys = systemOrder.get(b.slug);
    if (aSys !== undefined && bSys !== undefined) return aSys - bSys;
    if (aSys !== undefined) return -1;
    if (bSys !== undefined) return 1;
    if (a.thuTu !== b.thuTu) return a.thuTu - b.thuTu;
    return a.ten.localeCompare(b.ten, "vi");
  });
}

/**
 * Nhãn timeline / menu card: ghim nhãn hệ thống đầu danh sách;
 * owner luôn thấy đủ nhãn mặc định (kể cả count 0).
 */
export function orderTimelinePersonalFilters(
  filters: ReadonlyArray<PersonalFilter>,
  options?: { isOwner?: boolean },
): PersonalFilter[] {
  let list = filters.filter((f) => {
    if (options?.isOwner) return true;
    return (f.count ?? 0) > 0;
  });

  if (options?.isOwner) {
    const bySlug = new Map(list.map((f) => [f.slug, f]));
    for (const def of DEFAULT_PERSONAL_FILTER_DEFS) {
      if (!bySlug.has(def.slug)) {
        bySlug.set(def.slug, defaultPersonalFilterFallback(def, 0));
      }
    }
    list = [...bySlug.values()];
  }

  return sortSystemFiltersFirst(list);
}

/** @deprecated Dùng {@link orderTimelinePersonalFilters}. */
export function filterTimelinePersonalFilters<
  T extends { slug: string },
>(filters: T[]): T[] {
  return filters.filter((f) => !isHiddenPersonalFilterSlug(f.slug));
}
