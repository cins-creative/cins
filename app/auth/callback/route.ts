import { NextResponse, type NextRequest } from "next/server";

import {
  ACCOUNT_VAULT_COOKIE,
  decodeVault,
  setAccountVaultOnResponse,
  setRestoreHintOnResponse,
  upsertAccount,
} from "@/lib/auth/account-vault";
import { normalizeDevBindAllOrigin } from "@/lib/auth/auth-origin";
import type { LoginIntent } from "@/lib/auth/login-intent";
import {
  clearOAuthIntentOnResponse,
  readOAuthIntent,
} from "@/lib/auth/oauth-intent-server";
import { OAUTH_RETURN_COOKIE } from "@/lib/auth/oauth-return-constants";
import { normalizeOAuthReturnPath } from "@/lib/auth/oauth-return-path";
import { clearOAuthReturnOnResponse } from "@/lib/auth/oauth-return-server";
import {
  createSupabaseOAuthCallbackClient,
  flushDeferredAuthCookies,
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

function readOAuthReturnFromRequest(request: NextRequest): string | null {
  const raw = request.cookies.get(OAUTH_RETURN_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);
    return normalizeOAuthReturnPath(decoded);
  } catch {
    return null;
  }
}

/**
 * Google OAuth callback — exchange PKCE, ghi session cookie trực tiếp lên
 * response redirect (không copy từ staging response).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = normalizeDevBindAllOrigin(url.origin);
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

  const redirectResponse = NextResponse.redirect(new URL("/", origin));
  const supabase = await createSupabaseOAuthCallbackClient(
    request,
    redirectResponse,
  );

  const { data: exchangeData, error: exchangeErr } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    const msg = exchangeErr.message.includes("PKCE code verifier")
      ? "Phiên đăng nhập hết hạn hoặc mở sai trình duyệt. Vui lòng thử «Đăng nhập với Google» lại."
      : exchangeErr.message;
    return loginRedirect(origin, msg, safeNextFromQuery);
  }

  await flushDeferredAuthCookies();

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

  const returnFromCookie = readOAuthReturnFromRequest(request);
  const safeNext =
    safeNextFromQuery ?? returnFromCookie;

  let destination: URL;
  if (intent === "register") {
    destination = new URL("/onboarding", origin);
    destination.searchParams.set("intent", "register");
  } else {
    const { data: profile } = await supabase
      .from("user_nguoi_dung")
      .select("slug, giai_doan, ten_hien_thi, avatar_id")
      .eq("auth_user_id", user.id)
      .maybeSingle<{
        slug: string;
        giai_doan: string | null;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }>();

    if (!profile || !profile.giai_doan) {
      destination = new URL("/onboarding", origin);
    } else if (safeNext && safeNext !== "/") {
      destination = new URL(safeNext, origin);
    } else {
      // Sau đăng nhập → World Journey (trang chủ).
      destination = new URL("/", origin);
    }

    // Ghi nhớ tài khoản vừa đăng nhập (Google) vào kho chuyển nhanh.
    const refreshToken = exchangeData.session?.refresh_token;
    if (profile?.slug && refreshToken) {
      const vault = decodeVault(
        request.cookies.get(ACCOUNT_VAULT_COOKIE)?.value,
      );
      setAccountVaultOnResponse(
        redirectResponse,
        upsertAccount(vault, {
          slug: profile.slug,
          tenHienThi: profile.ten_hien_thi,
          avatarId: profile.avatar_id,
          refreshToken,
          addedAt: Date.now(),
        }),
      );
      setRestoreHintOnResponse(redirectResponse);
    }
  }

  redirectResponse.headers.set("Location", destination.toString());
  clearOAuthIntentOnResponse(redirectResponse);
  clearOAuthReturnOnResponse(redirectResponse);
  return redirectResponse;
}
