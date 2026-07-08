import type { SupabaseClient } from "@supabase/supabase-js";

import { mapOtpError } from "@/lib/auth/email-otp";

export type OtpVerifyType = "signup" | "email";

export function isExistingUnconfirmedSignup(user: {
  identities?: { id: string }[] | null;
} | null): boolean {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

/**
 * Gửi mã OTP xác nhận đăng ký. Thử `resend(signup)` trước; nếu tài khoản đã tồn tại
 * chưa confirm thì fallback `signInWithOtp` (verify type `email`).
 */
export async function sendSignupConfirmationOtp(
  supabase: SupabaseClient,
  email: string,
): Promise<
  { ok: true; verifyType: OtpVerifyType } | { ok: false; message: string }
> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return { ok: false, message: "Email không hợp lệ." };
  }

  const { error: resendErr } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
  });
  if (!resendErr) {
    return { ok: true, verifyType: "signup" };
  }

  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { shouldCreateUser: false },
  });
  if (!otpErr) {
    return { ok: true, verifyType: "email" };
  }

  return {
    ok: false,
    message: mapOtpError(otpErr.message || resendErr.message),
  };
}
