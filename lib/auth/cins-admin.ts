/**
 * Whitelist email CINs admin — sau khi login, các email này redirect thẳng `/admin`
 * thay vì `/onboarding` / `/{slug}/journey`.
 *
 * Khi sửa danh sách: bắt buộc lowercase, trim trước khi push.
 */
export const CINS_ADMIN_EMAILS: readonly string[] = [
  "nguyenthanhtu.nkl@gmail.com",
  "info.cins.vn@gmail.com",
] as const;

export function isCinsAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return CINS_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
