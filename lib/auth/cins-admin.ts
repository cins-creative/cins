/**
 * Legacy whitelist admin — chỉ fallback khi chưa có dòng `user_quyen_he_thong`.
 * Vai trò hệ thống (L19) lưu DB; super_admin suy từ `SUPER_ADMIN_EMAIL` trong app.
 *
 * Khi sửa danh sách: bắt buộc lowercase, trim trước khi push.
 */
export const CINS_ADMIN_EMAILS: readonly string[] = [] as const;

export function isCinsAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return CINS_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
