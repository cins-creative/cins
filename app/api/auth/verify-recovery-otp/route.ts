import { NextResponse, type NextRequest } from "next/server";

import {
  EMAIL_OTP_DIGIT_PATTERN,
  EMAIL_OTP_LENGTH,
  mapOtpError,
} from "@/lib/auth/email-otp";
import {
  RECOVERY_EMAIL_COOKIE,
  setRecoveryVerifiedCookie,
} from "@/lib/auth/recovery-cookie";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
  flushDeferredAuthCookies,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
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
 * POST /api/auth/verify-recovery-otp — xác nhận OTP recovery (bước 2).
 * Thành công → cookie phiên + `cins-pw-recovery-ok` để bước 3 đặt mật khẩu.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (rateLimited(`verify-recovery:${ip}`)) {
    return NextResponse.json(
      { error: "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const token =
    typeof (body as Record<string, unknown> | null)?.token === "string"
      ? (body as Record<string, string>).token.trim()
      : "";

  const email = request.cookies.get(RECOVERY_EMAIL_COOKIE)?.value?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      {
        error:
          "Phiên lấy lại mật khẩu đã hết hạn. Vui lòng gửi lại mã từ bước quên mật khẩu.",
      },
      { status: 400 },
    );
  }

  if (!EMAIL_OTP_DIGIT_PATTERN.test(token)) {
    return NextResponse.json(
      { error: `Nhập đủ ${EMAIL_OTP_LENGTH} số trong email.` },
      { status: 400 },
    );
  }

  /*
   * verifyOtp trên `@supabase/ssr` (PKCE + cookie) có thể không bao giờ
   * settle — UI kẹt «Đang kiểm tra…». Client anon không persist, rồi mới
   * ghi cookie phiên bằng setSession.
   */
  let verifyData: { user: unknown; session: { access_token: string; refresh_token: string } | null } | null =
    null;
  let verifyErrMessage: string | null = null;
  try {
    const publicAuth = createPublicSupabaseClient();
    const { data, error } = await publicAuth.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    verifyData = data;
    verifyErrMessage = error?.message ?? null;
  } catch {
    return NextResponse.json(
      { error: "Không kiểm tra được mã. Thử lại sau." },
      { status: 503 },
    );
  }

  if (verifyErrMessage || !verifyData?.user || !verifyData.session) {
    return NextResponse.json(
      { error: mapOtpError(verifyErrMessage ?? "Mã không đúng.") },
      { status: 401 },
    );
  }

  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);
  try {
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
    });
    if (sessionErr) {
      return NextResponse.json(
        {
          error:
            "Mã đúng nhưng không lưu được phiên. Bấm gửi lại mã rồi thử lại.",
        },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Mã đúng nhưng không lưu được phiên. Bấm gửi lại mã rồi thử lại.",
      },
      { status: 500 },
    );
  }

  await flushDeferredAuthCookies();
  setRecoveryVerifiedCookie(carrier);

  const response = NextResponse.json({ ok: true });
  appendSetCookieHeaders(carrier, response);
  return response;
}
