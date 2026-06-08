import "server-only";

/** Cột mốc hiện trên trang entity nhẹ (keyword / phần mềm / môn học). */
export const ENTITY_PAGE_VISIBLE_CHE_DO = [
  "public",
  "feature",
  "cong_dong",
] as const;

export type EntityPageVisibleCheDo =
  (typeof ENTITY_PAGE_VISIBLE_CHE_DO)[number];

const ENTITY_PAGE_VISIBLE_SET = new Set<string>(ENTITY_PAGE_VISIBLE_CHE_DO);

/** Tách biệt với `isMilestoneVisibleOnPublicJourney` — entity cho phép `cong_dong`. */
export function isMilestoneVisibleOnEntityPage(cheDoHienThi: string): boolean {
  return ENTITY_PAGE_VISIBLE_SET.has(cheDoHienThi);
}

export function applyEntityPageVisibilityInFilter<
  T extends { in: (col: string, vals: readonly string[]) => T },
>(query: T): T {
  return query.in("che_do_hien_thi", [...ENTITY_PAGE_VISIBLE_CHE_DO]);
}
