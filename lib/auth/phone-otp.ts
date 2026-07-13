import "server-only";

import { createHash, randomInt } from "crypto";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Helper cho 2FA qua SĐT: chuẩn hóa/validate SĐT VN, mask, hash OTP, ║
   ║ và stub gửi SMS (ráp provider thật sau).                          ║
   ║ Lưu ý §6: KHÔNG log OTP/SĐT chưa public; chỉ lưu ma_hash.          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export const PHONE_OTP_LENGTH = 6;
/** OTP hết hạn sau 5 phút. */
export const PHONE_OTP_TTL_SEC = 5 * 60;
/** Cooldown giữa 2 lần gửi mã. */
export const PHONE_OTP_RESEND_COOLDOWN_SEC = 60;
/** Số lần nhập sai tối đa cho một thử-thách trước khi phải gửi lại. */
export const PHONE_OTP_MAX_ATTEMPTS = 5;

/**
 * Chuẩn hóa SĐT Việt Nam về E.164 (`+84XXXXXXXXX`).
 * Chấp nhận `0XXXXXXXXX`, `84XXXXXXXXX`, `+84XXXXXXXXX` (có/không dấu cách, gạch).
 * Trả `null` nếu không phải SĐT di động VN hợp lệ.
 */
export function normalizeVietnamPhone(raw: string): string | null {
  const digits = raw.replace(/[\s.\-()]/g, "");
  let national: string | null = null;

  if (/^\+84\d{9}$/.test(digits)) {
    national = digits.slice(3);
  } else if (/^84\d{9}$/.test(digits)) {
    national = digits.slice(2);
  } else if (/^0\d{9}$/.test(digits)) {
    national = digits.slice(1);
  }

  if (!national) return null;
  // Đầu số di động VN: 3, 5, 7, 8, 9 (sau khi bỏ số 0 đầu).
  if (!/^[35789]\d{8}$/.test(national)) return null;

  return `+84${national}`;
}

/** Che giữa SĐT E.164 để hiển thị: `+8490***4567`. */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 7) return trimmed;
  const head = trimmed.slice(0, 5);
  const tail = trimmed.slice(-4);
  return `${head}***${tail}`;
}

/** Sinh mã OTP số ngẫu nhiên (an toàn về mật mã). */
export function generatePhoneOtp(): string {
  const max = 10 ** PHONE_OTP_LENGTH;
  return String(randomInt(0, max)).padStart(PHONE_OTP_LENGTH, "0");
}

/**
 * Hash OTP để lưu (không lưu mã thô). Trộn SĐT làm salt nhẹ; thêm pepper
 * từ env nếu có (`PHONE_OTP_PEPPER`).
 */
export function hashPhoneOtp(phone: string, code: string): string {
  const pepper = process.env.PHONE_OTP_PEPPER?.trim() ?? "";
  return createHash("sha256").update(`${phone}:${code}:${pepper}`).digest("hex");
}

/**
 * STUB gửi OTP qua SMS. Hiện KHÔNG gọi provider thật (chưa tốn phí).
 * KHÔNG log mã (theo §6). Khi ráp Twilio/eSMS: thay thân hàm này.
 */
export async function sendPhoneOtpStub(
  _phone: string,
  _code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: true };
}

/** Chỉ lộ mã ở môi trường không phải production để dev test luồng. */
export function isDevOtpEcho(): boolean {
  return process.env.NODE_ENV !== "production";
}
