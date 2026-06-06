import { NextResponse, type NextRequest } from "next/server";

import { isCinsAdminEmail } from "@/lib/auth/cins-admin";
import type { LoginIntent } from "@/lib/auth/login-intent";
import {
  clearOAuthIntentOnResponse,
  readOAuthIntent,
} from "@/lib/auth/oauth-intent-server";
import { normalizeOAuthReturnPath } from "@/lib/auth/oauth-return-path";
import {
  clearOAuthReturnOnResponse,
  readOAuthReturnTo,
} from "@/lib/auth/oauth-return-server";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(
  origin: string,
  message: string,
  next?: string | null,
): NextResponse {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", message);
  if (next?.startsWith("/") && !next.startsWith("//")) {
    loginUrl.searchParams.set("next", next);
  }
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
 * Google OAuth callback — exchange PKCE trên staging response, copy Set-Cookie
 * sang redirect cuối (Next.js 16 không gắn cookie từ cookies() lên NextResponse mới).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const errorDescription = url.searchParams.get("error_description");

  const safeNextFromQuery = normalizeOAuthReturnPath(nextParam);

  if (errorDescription) {
    return loginRedirect(origin, errorDescription, safeNextFromQuery);
  }
  if (!code) {
    return loginRedirect(
      origin,
      "Thiếu mã xác thực từ Google.",
      safeNextFromQuery,
    );
  }

  if (!hasVerifierCookie(request)) {
    return loginRedirect(
      origin,
      "Phiên đăng nhập không tìm thấy mã xác minh PKCE. " +
        "Hãy mở lại trang login trên cùng domain (vd. https://cins.vercel.app) " +
        "và thử «Đăng nhập với Google» lại. " +
        "Supabase → Redirect URLs: https://cins.vercel.app/auth/callback",
      safeNextFromQuery,
    );
  }

  const intent: LoginIntent = await readOAuthIntent(
    url.searchParams.get("intent"),
  );

  const stagingResponse = NextResponse.next({ request });
  const supabase = createSupabaseRouteHandlerClient(request, stagingResponse);

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    const msg = exchangeErr.message.includes("PKCE code verifier")
      ? "Phiên đăng nhập hết hạn hoặc mở sai trình duyệt. Vui lòng thử «Đăng nhập với Google» lại."
      : exchangeErr.message;
    return loginRedirect(origin, msg, safeNextFromQuery);
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return loginRedirect(
      origin,
      userErr?.message ?? "Không lấy được tài khoản sau xác thực.",
      safeNextFromQuery,
    );
  }

  const returnFromCookie = await readOAuthReturnTo();
  const safeNext =
    safeNextFromQuery ?? normalizeOAuthReturnPath(returnFromCookie);

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
        `/${encodeURIComponent(profile.slug)}`,
        origin,
      );
    }
  }

  const finalResponse = NextResponse.redirect(destination);
  appendSetCookieHeaders(stagingResponse, finalResponse);
  clearOAuthIntentOnResponse(finalResponse);
  clearOAuthReturnOnResponse(finalResponse);
  return finalResponse;
}
