import { NextResponse, type NextRequest } from "next/server";

import {
  manageHandoffPostUrl,
  MANAGE_TO_MANAGE_PATH,
  normalizeManageHandoffNext,
  webLoginForHandoffUrl,
} from "@/lib/cins/manage-handoff";
import { isManageHostname, WEB_ORIGIN } from "@/lib/cins/manage-site";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
  flushDeferredAuthCookies,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

function loginRedirect(request: NextRequest, nextPath: string): NextResponse {
  const host = request.nextUrl.hostname.toLowerCase();
  if (host === "cins.vn" || host === "www.cins.vn") {
    const url = new URL("/login", request.url);
    url.searchParams.set(
      "next",
      `${MANAGE_TO_MANAGE_PATH}?next=${encodeURIComponent(nextPath)}`,
    );
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(webLoginForHandoffUrl(nextPath));
}

/**
 * GET /auth/to-manage?next=/seller/inventory
 * Đọc phiên trên cins.vn (cookie host-only) rồi POST token sang manage.cins.vn.
 */
export async function GET(request: NextRequest) {
  const nextPath = normalizeManageHandoffNext(
    request.nextUrl.searchParams.get("next"),
  );
  if (!nextPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const host = request.nextUrl.hostname.toLowerCase();
  const onManage =
    isManageHostname(host) || process.env.CINS_SURFACE === "manage";

  if (onManage) {
    const web = new URL(MANAGE_TO_MANAGE_PATH, WEB_ORIGIN);
    web.searchParams.set("next", nextPath);
    return NextResponse.redirect(web);
  }

  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await flushDeferredAuthCookies();

  if (
    !user ||
    !session?.access_token ||
    !session.refresh_token
  ) {
    return loginRedirect(request, nextPath);
  }

  const postUrl = manageHandoffPostUrl();
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đang vào quản lý…</title>
</head>
<body>
<p>Đang vào trang quản lý…</p>
<form id="h" method="POST" action="${escapeHtmlAttr(postUrl)}">
<input type="hidden" name="access_token" value="${escapeHtmlAttr(session.access_token)}">
<input type="hidden" name="refresh_token" value="${escapeHtmlAttr(session.refresh_token)}">
<input type="hidden" name="next" value="${escapeHtmlAttr(nextPath)}">
<button type="submit">Tiếp tục</button>
</form>
<script>document.getElementById("h").submit()</script>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, no-cache, must-revalidate",
    },
  });
  appendSetCookieHeaders(carrier, res);
  return res;
}
