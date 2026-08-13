/** Root trang cộng đồng: `/community/:slug`. */
export function congDongRootPath(orgSlug: string): string {
  return `/community/${encodeURIComponent(orgSlug.trim())}`;
}

/** Chi tiết sự kiện trong shell cộng đồng: `/community/:slug/events/:suKienSlug`. */
export function congDongSuKienPath(orgSlug: string, suKienSlugOrId: string): string {
  return `${congDongRootPath(orgSlug)}/su-kien/${encodeURIComponent(suKienSlugOrId.trim())}`;
}

/** Ưu tiên `slug` sự kiện; fallback id (UUID / legacy). */
export function congDongSuKienCardPath(
  orgSlug: string,
  sk: { id: string; slug?: string | null },
): string {
  return congDongSuKienPath(orgSlug, sk.slug?.trim() || sk.id);
}

/** Tab Quản lý sự kiện (duyệt quầy / RSVP). */
export function congDongSuKienManagePath(
  orgSlug: string,
  suKienSlugOrId: string,
): string {
  return `${congDongSuKienPath(orgSlug, suKienSlugOrId)}?manage=1`;
}
