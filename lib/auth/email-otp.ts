export const EMAIL_OTP_LENGTH = 6;

export const EMAIL_OTP_RESEND_COOLDOWN_SEC = 60;

export function normalizeOtpInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH);
}

export function isCompleteOtp(value: string): boolean {
  return normalizeOtpInput(value).length === EMAIL_OTP_LENGTH;
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

export function mapOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("otp_expired")) {
    return "Mã đã hết hạn. Bấm «Gửi lại mã» để nhận mã mới.";
  }
  if (
    lower.includes("invalid") ||
    lower.includes("token") ||
    lower.includes("otp")
  ) {
    return "Mã không đúng. Kiểm tra lại 6 số trong email.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  }
  return message;
}
