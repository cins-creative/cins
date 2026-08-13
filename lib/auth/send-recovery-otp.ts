import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractEmailOtp,
  mapOtpError,
  parseRetryAfterSeconds,
} from "@/lib/auth/email-otp";
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

function loadResetPasswordTemplate(): string | null {
  try {
    return readFileSync(
      join(process.cwd(), "supabase/email-templates/reset-password.html"),
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

function buildResetPasswordHtml(email: string, token: string): string {
  const site = assetSiteUrl();
  const safeEmail = escapeHtml(email);
  const safeToken = escapeHtml(token);
  const tpl = loadResetPasswordTemplate();
  if (tpl) {
    return tpl
      .replaceAll("{{ .Email }}", safeEmail)
      .replaceAll("{{ .Token }}", safeToken)
      .replaceAll("{{ .SiteURL }}", site);
  }
  return `<!DOCTYPE html><html lang="vi"><body style="font-family:sans-serif;background:#f4f6f8;padding:24px;color:#111827">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e3e8ef">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2f80ed">Khôi phục mật khẩu</p>
    <h1 style="margin:0 0 12px;font-size:22px">Mã lấy lại mật khẩu CINs</h1>
    <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">Email <strong>${safeEmail}</strong> — nhập mã 8 số dưới đây trên trang lấy lại mật khẩu.</p>
    <p style="margin:0;text-align:center;font-size:32px;font-weight:700;letter-spacing:.28em;color:#1d4ed8">${safeToken}</p>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b">Mã hiệu lực 60 phút. CINs · <a href="${site}">${site}</a></p>
  </div></body></html>`;
}

function isUnknownUserMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("user not found") ||
    lower.includes("unable to find") ||
    lower.includes("email not confirmed") ||
    lower.includes("signup_disabled")
  );
}

/**
 * Lấy OTP recovery từ Auth Admin (`generateLink`) rồi gửi qua Resend.
 * Cùng đường với signup OTP — bypass Custom SMTP Supabase khi SMTP im.
 */
async function sendRecoveryOtpViaResend(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string; retryAfterSec?: number }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu cấu hình server Auth." };
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, message: "Thiếu RESEND_API_KEY." };
  }

  const admin = createServiceRoleClient();
  const magic = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const otp = extractEmailOtp(magic.data);
  if (magic.error || !otp) {
    const raw = magic.error?.message || "Không tạo được mã OTP.";
    if (isUnknownUserMessage(raw)) {
      return { ok: true };
    }
    return {
      ok: false,
      message: mapOtpError(raw),
      retryAfterSec: parseRetryAfterSeconds(raw) ?? undefined,
    };
  }

  const html = buildResetPasswordHtml(email, otp);
  const sent = await sendResendEmail({
    to: email,
    subject: "Mã lấy lại mật khẩu CINs của bạn",
    html,
    text: `Mã lấy lại mật khẩu CINs của bạn: ${otp}\nHiệu lực 60 phút.`,
    idempotencyKey: `recovery-otp:${email}:${otp}`,
  });

  if (!sent.ok) {
    console.error("[auth] recovery OTP Resend failed", sent.error, {
      from: resendFromAddress(),
    });
    return {
      ok: false,
      message: sent.skipped
        ? "Hệ thống email chưa bật. Thử lại sau."
        : "Không gửi được email. Kiểm tra địa chỉ hoặc thử lại sau.",
    };
  }

  return { ok: true };
}

/**
 * Gửi mã OTP khôi phục mật khẩu.
 * Ưu tiên Resend + Admin `generateLink` (type recovery); fallback SMTP Auth.
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

  const viaResend = await sendRecoveryOtpViaResend(trimmed);
  if (viaResend.ok) {
    return { ok: true };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo,
  });

  if (!error) {
    return { ok: true };
  }

  if (isUnknownUserMessage(error.message)) {
    return { ok: true };
  }

  return {
    ok: false,
    message: viaResend.message || mapOtpError(error.message),
  };
}
