/** Root trang cộng đồng: `/cong-dong/:slug`. */
export function congDongRootPath(orgSlug: string): string {
  return `/cong-dong/${encodeURIComponent(orgSlug.trim())}`;
}

/** Chi tiết sự kiện trong shell cộng đồng: `/cong-dong/:slug/su-kien/:suKienId`. */
export function congDongSuKienPath(orgSlug: string, suKienId: string): string {
  return `${congDongRootPath(orgSlug)}/su-kien/${encodeURIComponent(suKienId.trim())}`;
}

/** Tab Quản lý sự kiện (duyệt quầy / RSVP). */
export function congDongSuKienManagePath(
  orgSlug: string,
  suKienId: string,
): string {
  return `${congDongSuKienPath(orgSlug, suKienId)}?manage=1`;
}
