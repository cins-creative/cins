import { NextResponse, type NextRequest } from "next/server";

import { normalizeOAuthReturnPath } from "@/lib/auth/oauth-return-path";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/route-handler";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* Thông báo chung — không lộ tài khoản nào tồn tại (chống user enumeration). */
const GENERIC_AUTH_ERR = "Sai tài khoản hoặc mật khẩu.";

/**
 * Rate-limit best-effort theo IP (cửa sổ trượt trong RAM). Trên serverless mỗi
 * instance giữ riêng → chỉ là lớp chặn brute-force thô; production nên thay bằng
 * store bền (Upstash/KV) — xem CINS_DEV_RULES §6.
 */
const ATTEMPT_WINDOW_MS = 60_000;
const ATTEMPT_MAX = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > ATTEMPT_MAX;
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
 * POST /api/auth/login — đăng nhập bằng email hoặc username (slug) + mật khẩu.
 *
 * Username → email được tra **server-side** bằng service role; email không bao
 * giờ trả về client. Sign-in xảy ra trên route-handler client để session cookie
 * (httpOnly) khớp với `@supabase/ssr` cho các request sau.
 */
export async function POST(request: NextRequest) {
  if (rateLimited(clientIp(request))) {
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
  const identifier =
    typeof payload?.identifier === "string" ? payload.identifier.trim() : "";
  const password =
    typeof payload?.password === "string" ? payload.password : "";
  const safeNext = normalizeOAuthReturnPath(
    typeof payload?.next === "string" ? payload.next : null,
  );

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." },
      { status: 400 },
    );
  }

  let email = identifier;
  if (!isEmail(identifier)) {
    if (!hasServiceRoleEnv()) {
      return NextResponse.json(
        { error: "Hãy đăng nhập bằng địa chỉ email." },
        { status: 400 },
      );
    }
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("auth_user_id")
      .eq("slug", identifier.toLowerCase())
      .maybeSingle<{ auth_user_id: string }>();
    if (!profile) {
      return NextResponse.json({ error: GENERIC_AUTH_ERR }, { status: 401 });
    }
    const { data: userRes, error: adminErr } =
      await admin.auth.admin.getUserById(profile.auth_user_id);
    const resolved = userRes?.user?.email;
    if (adminErr || !resolved) {
      return NextResponse.json({ error: GENERIC_AUTH_ERR }, { status: 401 });
    }
    email = resolved;
  }

  /* Carrier chỉ để gom Set-Cookie từ signInWithPassword → copy sang response cuối. */
  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    const lower = error?.message?.toLowerCase() ?? "";
    const msg = lower.includes("email not confirmed")
      ? "Email chưa được xác nhận. Vui lòng mở email kích hoạt rồi đăng nhập lại."
      : GENERIC_AUTH_ERR;
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("slug, giai_doan")
    .eq("auth_user_id", data.user.id)
    .maybeSingle<{ slug: string; giai_doan: string | null }>();

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
  return response;
}
