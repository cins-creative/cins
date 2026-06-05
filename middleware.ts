import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";
import { appendSetCookieHeaders } from "@/lib/supabase/route-handler";

/** Đổi thành `false` trước khi deploy production bình thường. */
const MAINTENANCE_MODE = true;

/**
 * Hostname bị maintenance khi `MAINTENANCE_MODE = true`.
 * Hiện tại chỉ chặn ở custom domain production `cins.vn`. Vercel preview
 * (`*.vercel.app`) và localhost vẫn hoạt động bình thường để team test.
 */
const MAINTENANCE_HOSTS = new Set<string>(["cins.vn", "www.cins.vn"]);

function shouldApplyMaintenance(hostname: string): boolean {
  return MAINTENANCE_HOSTS.has(hostname.toLowerCase());
}

/**
 * Path luôn cho qua mọi check (maintenance + auth):
 *   - `/login`, `/auth/*`, `/api/auth/*` — vào auth bất cứ khi nào
 *   - `/maintenance`, static, favicon
 */
function isBypassedPath(pathname: string): boolean {
  if (pathname === "/maintenance") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/_next/static")) return true;
  if (pathname.startsWith("/_next/image")) return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

/**
 * Routes yêu cầu đăng nhập:
 *   - `/onboarding` (full-page welcome cho user mới — điền ten_hien_thi/slug/giai_doan)
 *   - `/admin`, `/admin/*` (panel)
 *   - `/{slug}` và `/{slug}/journey` legacy (owner journey + viewer)
 *   - `/{slug}/p/new`, `/{slug}/p/[slug]/edit` (trình tạo / sửa bài viết)
 *
 * Khi có session → cho qua (bỏ qua maintenance). Khi không → redirect /login.
 */
function isProtectedPath(pathname: string): boolean {
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return true;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;

  const publicTopLevel = new Set([
    "api",
    "auth",
    "bai-viet",
    "gallery",
    "invite",
    "keyword",
    "login",
    "maintenance",
    "nganh-hoc",
    "nghe-nghiep",
    "onboarding",
    "search",
    "settings",
    "truong-dai-hoc",
  ]);

  /* `/{slug}` — profile chính, slug không bắt đầu bằng "_" và không trùng route public. */
  const profileMatch = pathname.match(/^\/([^/.]+)\/?$/);
  if (
    profileMatch &&
    !profileMatch[1].startsWith("_") &&
    !publicTopLevel.has(profileMatch[1])
  ) {
    return true;
  }

  /* Legacy `/{slug}/journey` — giữ protected khi link cũ còn tồn tại. */
  const journeyMatch = pathname.match(/^\/([^/]+)\/journey(?:\/|$)/);
  if (journeyMatch && !journeyMatch[1].startsWith("_")) return true;

  /* Trình tạo / sửa bài: `/{slug}/p/new` hoặc `/{slug}/p/{postSlug}/edit`. */
  const postEditorMatch = pathname.match(
    /^\/([^/]+)\/p\/(new|[^/]+\/edit)(?:\/|$)/,
  );
  if (postEditorMatch && !postEditorMatch[1].startsWith("_")) return true;

  return false;
}

/** URL cũ `?tab=nganh-hoc` → `/nganh-hoc` (giữ `q`, `nhom`) trước khi render trang. */
function redirectLegacyNganhHubTab(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/nghe-nghiep") return null;
  if (searchParams.get("tab") !== "nganh-hoc") return null;

  const url = request.nextUrl.clone();
  url.pathname = "/nganh-hoc";
  url.searchParams.delete("tab");
  return NextResponse.redirect(url, 308);
}

function redirectLegacyJourneyPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/([^/]+)\/journey\/?$/);
  if (!match || match[1].startsWith("_")) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/${match[1]}`;
  return NextResponse.redirect(url, 308);
}

/**
 * Resolve session bằng `@supabase/ssr` server client với cookie adapter cho middleware.
 * Trả về `{ response, user }` — response đã được sync cookies refresh token (nếu Supabase
 * đã refresh trong lúc `getUser()`). Caller phải dùng response này (không tạo
 * `NextResponse.next()` mới) để không mất cookie.
 */
async function resolveSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();

  let response = NextResponse.next({ request });

  if (!url || !key) {
    /* Thiếu env → coi như chưa login. Tránh crash middleware ở dev/preview. */
    return { response, userId: null };
  }

  const supabase = createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, userId: user?.id ?? null };
}

function redirectToLogin(
  request: NextRequest,
  sessionResponse: NextResponse,
): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const fullPath = request.nextUrl.pathname + request.nextUrl.search;
  loginUrl.searchParams.set("next", fullPath);

  const redirect = NextResponse.redirect(loginUrl);
  appendSetCookieHeaders(sessionResponse, redirect);
  return redirect;
}

export async function middleware(request: NextRequest) {
  const legacyNganh = redirectLegacyNganhHubTab(request);
  if (legacyNganh) return legacyNganh;
  const legacyJourney = redirectLegacyJourneyPath(request);
  if (legacyJourney) return legacyJourney;

  const { pathname } = request.nextUrl;

  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  /* Protected routes — check session bất kể MAINTENANCE_MODE. */
  if (isProtectedPath(pathname)) {
    const { response, userId } = await resolveSession(request);
    if (!userId) {
      return redirectToLogin(request, response);
    }
    /* Có session → cho qua, KỂ CẢ trong maintenance mode (admin/tester vào được). */
    return response;
  }

  /* Còn lại: maintenance rewrite — chỉ áp dụng cho host trong `MAINTENANCE_HOSTS`. */
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }
  if (!shouldApplyMaintenance(request.nextUrl.hostname)) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL("/maintenance", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
