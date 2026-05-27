import { NextResponse, type NextRequest } from "next/server";

import { isCinsAdminEmail } from "@/lib/auth/cins-admin";
import type { LoginIntent } from "@/lib/auth/login-intent";
import {
  clearOAuthIntentOnResponse,
  readOAuthIntent,
} from "@/lib/auth/oauth-intent-server";
import {
  copySupabaseCookies,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";

function loginRedirect(origin: string, message: string): NextResponse {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

function hasVerifierCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") && c.name.includes("auth-token-code-verifier"),
    );
}

/**
 * Google OAuth callback — đọc PKCE verifier từ request cookies, exchange trên
 * response redirect (pattern `@supabase/ssr` cho Route Handlers).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    return loginRedirect(origin, errorDescription);
  }
  if (!code) {
    return loginRedirect(origin, "Thiếu mã xác thực từ Google.");
  }

  if (!hasVerifierCookie(request)) {
    return loginRedirect(
      origin,
      "Phiên đăng nhập không tìm thấy mã xác minh PKCE. " +
        "Hãy đăng nhập lại tại cùng địa chỉ bạn đã bấm «Đăng nhập với Google» " +
        "(vd. http://localhost:3001, không dùng 127.0.0.1). " +
        "Kiểm tra Supabase → Authentication → Redirect URLs có `/auth/callback`.",
    );
  }

  const intent: LoginIntent = await readOAuthIntent(
    url.searchParams.get("intent"),
  );

  /* Response tạm — mọi cookie session sau exchange gắn lên đây trước khi copy sang redirect cuối. */
  const exchangeResponse = NextResponse.redirect(new URL("/login", origin));
  const supabase = createSupabaseRouteHandlerClient(request, exchangeResponse);

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
    code,
  );
  if (exchangeErr) {
    const msg = exchangeErr.message.includes("PKCE code verifier")
      ? "Phiên đăng nhập hết hạn hoặc mở sai trình duyệt. Vui lòng thử «Đăng nhập với Google» lại."
      : exchangeErr.message;
    return loginRedirect(origin, msg);
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return loginRedirect(
      origin,
      userErr?.message ?? "Không lấy được tài khoản sau xác thực.",
    );
  }

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  let destination: URL;
  if (intent === "register") {
    destination = new URL("/onboarding", origin);
    destination.searchParams.set("intent", "register");
  } else if (isCinsAdminEmail(user.email)) {
    destination = new URL("/admin", origin);
  } else {
    const { data: profile } = await supabase
      .from("user_nguoi_dung")
      .select("slug, giai_doan")
      .eq("auth_user_id", user.id)
      .maybeSingle<{ slug: string; giai_doan: string | null }>();

    if (!profile || !profile.giai_doan) {
      destination = new URL("/onboarding", origin);
    } else if (safeNext) {
      destination = new URL(safeNext, origin);
    } else {
      destination = new URL(
        `/${encodeURIComponent(profile.slug)}/journey`,
        origin,
      );
    }
  }

  const finalResponse = NextResponse.redirect(destination);
  copySupabaseCookies(exchangeResponse, finalResponse);
  clearOAuthIntentOnResponse(finalResponse);
  return finalResponse;
}
