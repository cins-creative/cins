import { NextResponse, type NextRequest } from "next/server";

import {
  ACCOUNT_VAULT_COOKIE,
  decodeVault,
  setAccountVaultOnResponse,
  setRestoreHintOnResponse,
  upsertAccount,
} from "@/lib/auth/account-vault";
import { mapOtpError } from "@/lib/auth/email-otp";
import { normalizeOAuthReturnPath } from "@/lib/auth/oauth-return-path";
import {
  clearRecoveryEmailCookie,
  RECOVERY_EMAIL_COOKIE,
} from "@/lib/auth/recovery-cookie";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_PASSWORD = 6;

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
 * POST /api/auth/reset-password — xác nhận OTP recovery + đặt mật khẩu mới.
 * Email lấy từ cookie httpOnly do `/forgot-password` ghi.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (rateLimited(`reset:${ip}`)) {
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

  const payload = body as Record<string, unknown> | null;
  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const password =
    typeof payload?.password === "string" ? payload.password : "";
  const safeNext = normalizeOAuthReturnPath(
    typeof payload?.next === "string" ? payload.next : null,
  );

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

  if (!/^\d{6}$/.test(token)) {
    return NextResponse.json(
      { error: "Nhập đủ 6 số trong email." },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Mật khẩu mới cần tối thiểu ${MIN_PASSWORD} ký tự.` },
      { status: 400 },
    );
  }

  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);

  const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (verifyErr || !verifyData.user) {
    return NextResponse.json(
      { error: mapOtpError(verifyErr?.message ?? "Mã không đúng.") },
      { status: 401 },
    );
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password });
  if (updateErr) {
    const lower = updateErr.message.toLowerCase();
    if (lower.includes("password should be") || lower.includes("weak")) {
      return NextResponse.json(
        { error: `Mật khẩu mới cần tối thiểu ${MIN_PASSWORD} ký tự.` },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Không đổi được mật khẩu. Vui lòng thử lại." },
      { status: 422 },
    );
  }

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("slug, giai_doan, ten_hien_thi, avatar_id")
    .eq("auth_user_id", verifyData.user.id)
    .maybeSingle<{
      slug: string;
      giai_doan: string | null;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  let redirectTo: string;
  if (!profile || !profile.giai_doan) {
    redirectTo = "/onboarding";
  } else if (safeNext && safeNext !== "/") {
    redirectTo = safeNext;
  } else {
    redirectTo = "/";
  }

  const response = NextResponse.json({ ok: true, redirect: redirectTo });
  appendSetCookieHeaders(carrier, response);
  clearRecoveryEmailCookie(response);

  if (profile?.slug && verifyData.session?.refresh_token) {
    const vault = decodeVault(request.cookies.get(ACCOUNT_VAULT_COOKIE)?.value);
    setAccountVaultOnResponse(
      response,
      upsertAccount(vault, {
        slug: profile.slug,
        tenHienThi: profile.ten_hien_thi,
        avatarId: profile.avatar_id,
        refreshToken: verifyData.session.refresh_token,
        addedAt: Date.now(),
      }),
    );
    setRestoreHintOnResponse(response);
  }

  return response;
}
