/**
 * Trang xem bài cá nhân `/{owner}/p/{postSlug}`.
 * Không gồm compose (`/p/new…`) hay chỉnh sửa (`/p/{postSlug}/edit`).
 */
export function isPersonalPostViewPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 3) return false;
  if (parts[1] !== "p") return false;
  const postSlug = parts[2];
  return Boolean(postSlug) && postSlug !== "new";
}
