export const MAX_TRUONG_ORG_BAI_DANG_FILTERS = 12;

/** Settings / CRUD ngoài dropdown — provider lắng nghe để refresh nhãn. */
export const ORG_BAI_DANG_FILTERS_CHANGED_EVENT = "cins-org-bai-dang-filters-changed";

export const ORG_BAI_DANG_NHAN_FILTER_PREFIX = "nhan:";

export function orgBaiDangNhanFilterKey(slug: string): string {
  return `${ORG_BAI_DANG_NHAN_FILTER_PREFIX}${slug}`;
}

export function isOrgBaiDangNhanFilterKey(key: string): boolean {
  return key.startsWith(ORG_BAI_DANG_NHAN_FILTER_PREFIX);
}

export function orgBaiDangNhanSlugFromKey(key: string): string | null {
  if (!isOrgBaiDangNhanFilterKey(key)) return null;
  const slug = key.slice(ORG_BAI_DANG_NHAN_FILTER_PREFIX.length).trim();
  return slug || null;
}
