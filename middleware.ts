import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Đổi thành `false` trước khi deploy production bình thường. */
const MAINTENANCE_MODE = true;

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

function isBypassedPath(pathname: string): boolean {
  if (pathname === "/maintenance") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/_next/static")) return true;
  if (pathname.startsWith("/_next/image")) return true;
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

export function middleware(request: NextRequest) {
  const legacyNganh = redirectLegacyNganhHubTab(request);
  if (legacyNganh) return legacyNganh;

  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  const hostname = request.nextUrl.hostname;
  if (isLocalHost(hostname)) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/maintenance", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
