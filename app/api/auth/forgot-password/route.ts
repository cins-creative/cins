import { NextResponse, type NextRequest } from "next/server";

import { normalizeDevBindAllOrigin } from "@/lib/auth/auth-origin";
import {
  clearRecoveryEmailCookie,
  setRecoveryEmailCookie,
} from "@/lib/auth/recovery-cookie";
import { sendRecoveryOtp } from "@/lib/auth/send-recovery-otp";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* Thông báo chung — không lộ email/username có tồn tại. */
const GENERIC_OK =
  "Nếu tài khoản tồn tại, chúng tôi đã gửi mã 6 số tới email liên kết. Kiểm tra hộp thư và mục Spam/Quảng cáo.";

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

function isEmail(value: string): boolean {
  return value.includes("@");
}

/**
 * POST /api/auth/forgot-password — gửi OTP khôi phục mật khẩu.
 * Nhận email hoặc username (slug); username → email tra server-side.
 * Email thật ghi httpOnly cookie — không trả về body (chống enumeration).
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (rateLimited(`forgot:${ip}`)) {
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

  const identifier =
    typeof (body as Record<string, unknown> | null)?.identifier === "string"
      ? (body as Record<string, string>).identifier.trim()
      : "";

  if (!identifier) {
    return NextResponse.json(
      { error: "Vui lòng nhập email hoặc tên tài khoản." },
      { status: 400 },
    );
  }

  let email: string | null = null;

  if (isEmail(identifier)) {
    email = identifier.toLowerCase();
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
    }
  } else {
    if (!hasServiceRoleEnv()) {
      return NextResponse.json(
        { error: "Hãy dùng địa chỉ email để lấy lại mật khẩu." },
        { status: 400 },
      );
    }
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("auth_user_id")
      .eq("slug", identifier.toLowerCase())
      .maybeSingle<{ auth_user_id: string }>();

    if (profile) {
      const { data: userRes } = await admin.auth.admin.getUserById(
        profile.auth_user_id,
      );
      const resolved = userRes?.user?.email;
      if (resolved) email = resolved.toLowerCase();
    }
  }

  const response = NextResponse.json({
    ok: true,
    message: GENERIC_OK,
    /* Chỉ để UI mask — trùng với những gì user đã gõ; không lộ username→email. */
    hintEmail: isEmail(identifier) ? identifier.toLowerCase() : null,
  });

  if (!email) {
    clearRecoveryEmailCookie(response);
    return response;
  }

  if (rateLimited(`forgot:${ip}:${email}`)) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh. Vui lòng đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  const origin = normalizeDevBindAllOrigin(request.nextUrl.origin);
  const redirectTo = `${origin}/login`;

  const supabase = createPublicSupabaseClient();
  const result = await sendRecoveryOtp(supabase, email, redirectTo);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 422 });
  }

  setRecoveryEmailCookie(response, email);
  return response;
}
