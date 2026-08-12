import { NextResponse, type NextRequest } from "next/server";

import { sendSignupOtpViaResend } from "@/lib/auth/send-signup-otp-resend";
import { sendSignupConfirmationOtp } from "@/lib/auth/send-signup-otp";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * POST /api/auth/resend-signup-otp — gửi (hoặc gửi lại) mã OTP xác nhận đăng ký.
 * Ưu tiên Resend API (`cins-app`) + Admin `generateLink`; fallback SMTP Auth nếu Resend lỗi.
 * Không tiết lộ email có tồn tại hay không khi thành công.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (rateLimited(`otp:${ip}`)) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh. Vui lòng đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const email =
    typeof (body as Record<string, unknown> | null)?.email === "string"
      ? (body as Record<string, string>).email.trim().toLowerCase()
      : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }

  if (rateLimited(`otp:${ip}:${email}`)) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh. Vui lòng đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  const viaResend = await sendSignupOtpViaResend(email);
  if (viaResend.ok) {
    return NextResponse.json({
      ok: true,
      verifyType: viaResend.verifyType,
      via: "resend",
    });
  }

  /* Resend lỗi cấu hình/gửi → fallback SMTP Auth (Custom SMTP). */
  const supabase = createPublicSupabaseClient();
  const result = await sendSignupConfirmationOtp(supabase, email);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: viaResend.message || result.message,
        retryAfterSec: viaResend.retryAfterSec ?? result.retryAfterSec,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true, verifyType: result.verifyType, via: "smtp" });
}
