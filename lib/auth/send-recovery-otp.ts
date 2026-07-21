import type { SupabaseClient } from "@supabase/supabase-js";

import { mapOtpError } from "@/lib/auth/email-otp";

/**
 * Gửi mã OTP khôi phục mật khẩu (template Supabase «Reset password»).
 * Không tiết lộ email có tồn tại hay không — lỗi «user not found» coi như thành công.
 */
export async function sendRecoveryOtp(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return { ok: false, message: "Email không hợp lệ." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo,
  });

  if (!error) {
    return { ok: true };
  }

  const lower = error.message.toLowerCase();
  /* Anti-enumeration: email không tồn tại / chưa confirm → vẫn báo đã gửi. */
  if (
    lower.includes("user not found") ||
    lower.includes("unable to find") ||
    lower.includes("email not confirmed") ||
    lower.includes("signup_disabled")
  ) {
    return { ok: true };
  }

  return { ok: false, message: mapOtpError(error.message) };
}
