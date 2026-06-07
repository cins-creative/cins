import type { PersonalFilter } from "@/lib/filter/types";

/** Nhãn riêng hệ thống — client + server (không import server-only). */
export const CONG_DONG_PERSONAL_FILTER_SLUG = "cong-dong";
export const CONG_DONG_PERSONAL_FILTER_TEN = "Cộng đồng";
export const CONG_DONG_PERSONAL_FILTER_MAU = "#1F74C9";

const SYSTEM_FILTER_SLUGS = new Set([CONG_DONG_PERSONAL_FILTER_SLUG]);

export function isSystemPersonalFilterSlug(slug: string): boolean {
  return SYSTEM_FILTER_SLUGS.has(slug);
}

/** @deprecated Dùng {@link isSystemPersonalFilterSlug}. */
export function isHiddenPersonalFilterSlug(slug: string): boolean {
  return isSystemPersonalFilterSlug(slug);
}

/** Slug cố định — fallback UI khi owner chưa hydrate DB. */
export function congDongPersonalFilterFallback(count = 0): PersonalFilter {
  return {
    id: "system-cong-dong",
    ten: CONG_DONG_PERSONAL_FILTER_TEN,
    slug: CONG_DONG_PERSONAL_FILTER_SLUG,
    mau: CONG_DONG_PERSONAL_FILTER_MAU,
    thuTu: -1,
    count,
  };
}

export function countUserPersonalFilters<
  T extends { slug: string },
>(filters: ReadonlyArray<T>): number {
  return filters.filter((f) => !isSystemPersonalFilterSlug(f.slug)).length;
}

/**
 * Nhãn timeline: ghim `Cộng đồng` đầu section; owner luôn thấy (kể cả count 0).
 * Khách chỉ thấy nhãn hệ thống khi có ít nhất 1 cột mốc gắn nhãn.
 */
export function orderTimelinePersonalFilters(
  filters: ReadonlyArray<PersonalFilter>,
  options?: { isOwner?: boolean },
): PersonalFilter[] {
  let list = filters.filter((f) => {
    if (!isSystemPersonalFilterSlug(f.slug)) return true;
    if (options?.isOwner) return true;
    return (f.count ?? 0) > 0;
  });

  const congIdx = list.findIndex((f) => f.slug === CONG_DONG_PERSONAL_FILTER_SLUG);
  if (congIdx === -1 && options?.isOwner) {
    list = [congDongPersonalFilterFallback(0), ...list];
  } else if (congIdx > 0) {
    const next = [...list];
    const [cong] = next.splice(congIdx, 1);
    next.unshift(cong);
    list = next;
  }

  return list;
}

/** @deprecated Dùng {@link orderTimelinePersonalFilters}. */
export function filterTimelinePersonalFilters<
  T extends { slug: string },
>(filters: T[]): T[] {
  return filters.filter((f) => !isHiddenPersonalFilterSlug(f.slug));
}
