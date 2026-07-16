import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { buildCanonicalHostRedirect } from "@/lib/auth/auth-origin";
import { OG_IMAGE_CACHE_CONTROL } from "@/lib/journey/og-image-url";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";
import { appendSetCookieHeaders } from "@/lib/supabase/route-handler";

/** Đổi thành `false` trước khi deploy production bình thường. */
const MAINTENANCE_MODE = false;

/**
 * Hostname bị maintenance khi `MAINTENANCE_MODE = true`.
 * Chỉ chặn production `cins.vn` / `www.cins.vn`. Localhost và
 * `*.workers.dev` vẫn hoạt động bình thường để team test.
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
  if (pathname === "/apple-touch-icon.png") return true;
  if (pathname.startsWith("/assets/")) return true;
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
 *   - `/{slug}/p/new`, `/{slug}/p/[slug]/edit` (trình tạo / sửa bài viết)
 *
 * Journey / bài viết công khai — không chặn xem. Tương tác (thích, lưu, bình luận)
 * yêu cầu đăng nhập qua modal client.
 *
 * Khi có session → cho qua (bỏ qua maintenance). Khi không → redirect /login.
 */
function isProtectedPath(pathname: string): boolean {
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return true;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;

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
  if (pathname !== "/nghe-nghiep") {
    return null;
  }
  if (searchParams.get("tab") !== "nganh-hoc") return null;

  const url = request.nextUrl.clone();
  url.pathname = "/nganh-hoc";
  url.searchParams.delete("tab");
  return NextResponse.redirect(url, 308);
}

/** `/truong-dai-hoc` → `/co-so-dao-tao` (308). */
function redirectLegacyTruongDaiHocPath(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (
    pathname !== "/truong-dai-hoc" &&
    !pathname.startsWith("/truong-dai-hoc/")
  ) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = pathname.replace(/^\/truong-dai-hoc/, "/co-so-dao-tao");
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

/** Segment file metadata (OG/twitter/icon…) — không coi là slug tổ chức. */
const RESERVED_ORG_SEGMENTS = new Set([
  "opengraph-image",
  "twitter-image",
  "icon",
  "apple-icon",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
]);

function isReservedOrgSegment(seg: string): boolean {
  return seg.startsWith("_") || seg.includes(".") || RESERVED_ORG_SEGMENTS.has(seg);
}

/** `/co-so/:slug` → `/co-so/:slug/bai-dang` — tránh redirect RSC (meta refresh) gây lỗi lần đầu. */
function redirectCoSoRootToDefaultTab(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/co-so\/([^/]+)\/?$/);
  if (!match || isReservedOrgSegment(match[1])) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/co-so/${match[1]}/bai-dang`;
  return NextResponse.redirect(url, 308);
}

/** `/studio/:slug` → `/studio/:slug/bai-dang` — cùng pattern với cơ sở đào tạo. */
function redirectStudioRootToDefaultTab(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/studio\/([^/]+)\/?$/);
  if (!match || isReservedOrgSegment(match[1])) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/studio/${match[1]}/bai-dang`;
  return NextResponse.redirect(url, 308);
}

/** `/co-so-dao-tao/:slug` → `/co-so-dao-tao/:slug/bai-dang` — tránh meta refresh RSC. */
function redirectTruongRootToDefaultTab(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/co-so-dao-tao\/([^/]+)\/?$/);
  if (!match || isReservedOrgSegment(match[1])) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/co-so-dao-tao/${match[1]}/bai-dang`;
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
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headers) {
          for (const [header, value] of Object.entries(headers)) {
            response.headers.set(header, value);
          }
        }
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
  const canonicalHost = buildCanonicalHostRedirect(request.nextUrl);
  if (canonicalHost) {
    return NextResponse.redirect(canonicalHost.url, canonicalHost.status);
  }

  const legacyNganh = redirectLegacyNganhHubTab(request);
  if (legacyNganh) return legacyNganh;
  const legacyTruong = redirectLegacyTruongDaiHocPath(request);
  if (legacyTruong) return legacyTruong;
  const legacyJourney = redirectLegacyJourneyPath(request);
  if (legacyJourney) return legacyJourney;
  const coSoRoot = redirectCoSoRootToDefaultTab(request);
  if (coSoRoot) return coSoRoot;
  const studioRoot = redirectStudioRootToDefaultTab(request);
  if (studioRoot) return studioRoot;
  const truongRoot = redirectTruongRootToDefaultTab(request);
  if (truongRoot) return truongRoot;

  const { pathname } = request.nextUrl;

  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  /* OG image: gắn full URL vào request headers để opengraph-image đọc query
     (`view`/`nhom`/`filter`). Next file convention không luôn truyền searchParams.
     Đồng thời gắn Cache-Control dài hạn trên response wrapper (Vary RSC
     được gỡ trong `withOgImageCacheHeaders` ở opengraph-image.tsx). */
  let ogRequest = request;
  const isOgImage =
    pathname.endsWith("/opengraph-image") ||
    pathname.endsWith("/twitter-image");
  if (isOgImage) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-url", request.nextUrl.href);
    ogRequest = new NextRequest(request, { headers: requestHeaders });
  }

  const { response: sessionResponse, userId } = await resolveSession(ogRequest);

  if (isOgImage) {
    sessionResponse.headers.set("Cache-Control", OG_IMAGE_CACHE_CONTROL);
    sessionResponse.headers.set("CDN-Cache-Control", OG_IMAGE_CACHE_CONTROL);
    sessionResponse.headers.delete("vary");
    sessionResponse.headers.delete("Vary");
  }

  /* Protected routes — check session bất kể MAINTENANCE_MODE. */
  if (isProtectedPath(pathname)) {
    if (!userId) {
      return redirectToLogin(ogRequest, sessionResponse);
    }
    return sessionResponse;
  }

  /* Còn lại: maintenance rewrite — chỉ áp dụng cho host trong `MAINTENANCE_HOSTS`. */
  if (!MAINTENANCE_MODE) {
    return sessionResponse;
  }
  if (!shouldApplyMaintenance(request.nextUrl.hostname)) {
    return sessionResponse;
  }
  const maintenance = NextResponse.rewrite(new URL("/maintenance", request.url));
  appendSetCookieHeaders(sessionResponse, maintenance);
  return maintenance;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
