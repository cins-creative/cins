import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  extractEmailOtp,
  mapOtpError,
  parseRetryAfterSeconds,
} from "@/lib/auth/email-otp";
import type { OtpVerifyType } from "@/lib/auth/send-signup-otp";
import { sendResendEmail, resendFromAddress } from "@/lib/billing/send-email-resend";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

function assetSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(raw)) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://cins.vn";
}

function loadConfirmSignupTemplate(): string | null {
  try {
    return readFileSync(
      join(process.cwd(), "supabase/email-templates/confirm-signup.html"),
      "utf8",
    );
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildConfirmSignupHtml(email: string, token: string): string {
  const site = assetSiteUrl();
  const safeEmail = escapeHtml(email);
  const safeToken = escapeHtml(token);
  const tpl = loadConfirmSignupTemplate();
  if (tpl) {
    return tpl
      .replaceAll("{{ .Email }}", safeEmail)
      .replaceAll("{{ .Token }}", safeToken)
      .replaceAll("{{ .SiteURL }}", site);
  }
  /* Fallback khi Workers/bundle không đọc được file template. */
  return `<!DOCTYPE html><html lang="vi"><body style="font-family:sans-serif;background:#f4f6f8;padding:24px;color:#111827">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e3e8ef">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2f80ed">Xác nhận tài khoản</p>
    <h1 style="margin:0 0 12px;font-size:22px">Mã xác nhận đăng ký CINs</h1>
    <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">Email <strong>${safeEmail}</strong> — nhập mã 8 số dưới đây trên trang đăng ký.</p>
    <p style="margin:0;text-align:center;font-size:32px;font-weight:700;letter-spacing:.28em;color:#1d4ed8">${safeToken}</p>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b">Mã hiệu lực 60 phút. CINs · <a href="${site}">${site}</a></p>
  </div></body></html>`;
}

/**
 * Lấy OTP từ Auth Admin (`generateLink`) rồi gửi qua Resend (`RESEND_API_KEY` / cins-app).
 * Bypass Custom SMTP Supabase — dùng khi SMTP Auth im / không giao được mail.
 */
export async function sendSignupOtpViaResend(email: string): Promise<
  | { ok: true; verifyType: OtpVerifyType; resendId: string | null }
  | { ok: false; message: string; retryAfterSec?: number }
> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return { ok: false, message: "Email không hợp lệ." };
  }
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu cấu hình server Auth." };
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, message: "Thiếu RESEND_API_KEY." };
  }

  const admin = createServiceRoleClient();

  /* Resend không có password → không dùng type "signup" (SDK bắt buộc password,
   * và có thể tạo user orphan). magiclink lấy email_otp cho user đã tồn tại. */
  const verifyType: OtpVerifyType = "email";
  const magic = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: trimmed,
  });
  const otp = extractEmailOtp(magic.data);
  if (magic.error || !otp) {
    const raw = magic.error?.message || "Không tạo được mã OTP.";
    const lower = raw.toLowerCase();
    /* Anti-enumeration: email không tồn tại → báo đã gửi, không tạo user mới. */
    if (
      lower.includes("not found") ||
      lower.includes("unable to find") ||
      lower.includes("user not found")
    ) {
      return { ok: true, verifyType: "signup", resendId: null };
    }
    return {
      ok: false,
      message: mapOtpError(raw),
      retryAfterSec: parseRetryAfterSeconds(raw) ?? undefined,
    };
  }

  const html = buildConfirmSignupHtml(trimmed, otp);
  const sent = await sendResendEmail({
    to: trimmed,
    subject: "Mã xác nhận CINs của bạn",
    html,
    text: `Mã xác nhận CINs của bạn: ${otp}\nHiệu lực 60 phút.`,
    idempotencyKey: `signup-otp:${trimmed}:${otp}`,
  });

  if (!sent.ok) {
    console.error("[auth] signup OTP Resend failed", sent.error, {
      from: resendFromAddress(),
    });
    return {
      ok: false,
      message: sent.skipped
        ? "Hệ thống email chưa bật. Thử lại sau."
        : "Không gửi được email. Kiểm tra địa chỉ hoặc thử lại sau.",
    };
  }

  return { ok: true, verifyType, resendId: sent.id };
}
