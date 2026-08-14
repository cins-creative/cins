import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { buildCanonicalHostRedirect } from "@/lib/auth/auth-origin";
import { OG_IMAGE_CACHE_CONTROL } from "@/lib/journey/og-image-url";
import {
  rewriteLegacyPath,
  rewriteLegacyQuery,
} from "@/lib/navigation/legacy-url-map";
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
 * Path bỏ qua hoàn toàn (không resolveSession): static, maintenance,
 * `/auth/*` + `/api/auth/*` (tự quản cookie — PKCE / exchange).
 * `/login` KHÔNG thuộc nhóm này — xem `isSessionSyncOnlyPath`.
 */
function isBypassedPath(pathname: string): boolean {
  if (pathname === "/maintenance") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/apple-touch-icon.png") return true;
  if (pathname.startsWith("/assets/")) return true;
  if (pathname.startsWith("/_next/static")) return true;
  if (pathname.startsWith("/_next/image")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

/**
 * `/login` — đồng bộ cookie phiên (refresh token xoay) rồi cho qua,
 * KHÔNG áp maintenance rewrite (vẫn đăng nhập được khi bảo trì).
 */
function isSessionSyncOnlyPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
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

/** URL cũ `?tab=nganh-hoc` → `/majors` (giữ `q`, `group`) trước khi render trang. */
function redirectLegacyNganhHubTab(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/careers") return null;
  if (searchParams.get("tab") !== "nganh-hoc") return null;

  const url = request.nextUrl.clone();
  url.pathname = "/majors";
  url.searchParams.delete("tab");
  return NextResponse.redirect(url, 308);
}

/**
 * URL tiếng Việt cũ → URL tiếng Anh hiện tại (308 — giữ method + body nên POST
 * tới `/api/*` cũ vẫn chạy đúng). Thay 2 hàm redirect legacy rời rạc trước đây;
 * `/truong-dai-hoc` → `/university` giờ chỉ còn 1 chặng.
 *
 * Bảng sinh tự động: `lib/navigation/legacy-url-map.ts`.
 */
function redirectLegacyUrl(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  const nextPath = rewriteLegacyPath(pathname);
  const nextQuery = rewriteLegacyQuery(searchParams);
  if (!nextPath && nextQuery === null) return null;

  const url = request.nextUrl.clone();
  if (nextPath) url.pathname = nextPath;
  if (nextQuery !== null) url.search = nextQuery ? `?${nextQuery}` : "";
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

/** `/academy/:slug` → `/academy/:slug/posts` — tránh redirect RSC (meta refresh) gây lỗi lần đầu. */
function redirectCoSoRootToDefaultTab(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/academy\/([^/]+)\/?$/);
  if (!match || isReservedOrgSegment(match[1])) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/academy/${match[1]}/posts`;
  return NextResponse.redirect(url, 308);
}

/** `/studio/:slug` → `/studio/:slug/posts` — cùng pattern với cơ sở đào tạo. */
function redirectStudioRootToDefaultTab(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/studio\/([^/]+)\/?$/);
  if (!match || isReservedOrgSegment(match[1])) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/studio/${match[1]}/posts`;
  return NextResponse.redirect(url, 308);
}

/** `/university/:slug` → `/university/:slug/posts` — tránh meta refresh RSC. */
function redirectTruongRootToDefaultTab(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/university\/([^/]+)\/?$/);
  if (!match || isReservedOrgSegment(match[1])) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/university/${match[1]}/posts`;
  return NextResponse.redirect(url, 308);
}

/** Forward cookie đã mutate trên `request` + header phụ (x-pathname, x-url). */
function createSessionPassthrough(
  request: NextRequest,
  extraHeaders: Headers,
): NextResponse {
  const headers = new Headers(request.headers);
  extraHeaders.forEach((value, key) => {
    headers.set(key, value);
  });
  return NextResponse.next({ request: { headers } });
}

/**
 * Resolve session bằng `@supabase/ssr` server client với cookie adapter cho middleware.
 * Trả về `{ response, user }` — response đã được sync cookies refresh token (nếu Supabase
 * đã refresh trong lúc `getUser()`). Caller phải dùng response này (không tạo
 * `NextResponse.next()` mới) để không mất cookie.
 */
async function resolveSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  let response = createSessionPassthrough(request, requestHeaders);

  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
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
        /* Phải dựng lại từ request đã set cookie — snapshot header cũ làm RSC
         * đọc token đã tiêu thụ rồi xoay lần 2 / mất phiên (iPhone tắt Safari). */
        response = createSessionPassthrough(request, requestHeaders);
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

/** Expo web trên localhost — native app không đi CORS. */
function isLocalDevAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function corsResponseForLocalApp(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");
  if (!origin || !isLocalDevAppOrigin(origin)) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");
  return response;
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
  const legacyUrl = redirectLegacyUrl(request);
  if (legacyUrl) return legacyUrl;
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

  /* Forward pathname (+ OG URL) vào request headers cho Server Components/layout. */
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isOgImage =
    pathname.endsWith("/opengraph-image") ||
    pathname.endsWith("/twitter-image");
  if (isOgImage) {
    /* OG image: full URL để opengraph-image đọc query (`view`/`nhom`/`filter`). */
    requestHeaders.set("x-url", request.nextUrl.href);
  }

  const ogRequest = { headers: requestHeaders };

  /* Expo web (localhost:8081) gọi /api/* cross-origin. OPTIONS không có Bearer
   * — trả CORS ngay, không resolveSession (tránh treo preflight). */
  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return corsResponseForLocalApp(request, new NextResponse(null, { status: 204 }));
  }

  /* JWT native / cron secret — API không cần cookie session (tránh getUser xoay RT).
   * Trang protected (/admin…) vẫn đi cookie; Bearer giả không bỏ qua gate đó. */
  if (
    pathname.startsWith("/api/") &&
    /^Bearer\s+\S+/i.test(request.headers.get("authorization") ?? "")
  ) {
    return corsResponseForLocalApp(
      request,
      NextResponse.next({ request: ogRequest }),
    );
  }

  const { response: sessionResponse, userId } = await resolveSession(
    request,
    requestHeaders,
  );
  if (pathname.startsWith("/api/")) {
    corsResponseForLocalApp(request, sessionResponse);
  }

  /* TODO(2026-09): gỡ block này — dọn cookie kho đa tài khoản cũ
   * (~4 tuần sau deploy 2026-08-02). Chỉ xóa khi request mang cookie;
   * không đụng `sb-*-auth-token` (phiên đăng nhập chuẩn). */
  if (request.cookies.has("cins-accounts")) {
    sessionResponse.cookies.delete("cins-accounts");
  }
  if (request.cookies.has("cins-restore-hint")) {
    sessionResponse.cookies.delete("cins-restore-hint");
  }

  /* /login: chỉ sync cookie phiên — return trước maintenance + protected. */
  if (isSessionSyncOnlyPath(pathname)) {
    return sessionResponse;
  }

  if (isOgImage) {
    sessionResponse.headers.set("Cache-Control", OG_IMAGE_CACHE_CONTROL);
    sessionResponse.headers.set("CDN-Cache-Control", OG_IMAGE_CACHE_CONTROL);
    sessionResponse.headers.delete("vary");
    sessionResponse.headers.delete("Vary");
  }

  /* Protected routes — check session bất kể MAINTENANCE_MODE. */
  if (isProtectedPath(pathname)) {
    if (!userId) {
      return redirectToLogin(request, sessionResponse);
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
