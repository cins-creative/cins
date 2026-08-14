import { NextResponse } from "next/server";

import { appendSetCookieHeaders } from "@/lib/supabase/route-handler";

function sameOriginRelativePath(destination: URL, origin: string): string {
  try {
    const base = new URL(origin);
    if (destination.origin !== base.origin) return "/";
  } catch {
    return "/";
  }
  const path = `${destination.pathname}${destination.search}${destination.hash}`;
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

/**
 * Safari/iOS thường không persist cookie ghi trên 302 sau redirect Google
 * (bounce tracking / Set-Cookie trên redirect). Trả 200 HTML + Set-Cookie
 * rồi mới chuyển trang để cookie phiên sống sau khi tắt Safari.
 */
export function oauthSessionLandingResponse(
  origin: string,
  destination: URL,
  cookieSource: NextResponse,
): NextResponse {
  const path = sameOriginRelativePath(destination, origin);
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(path)}">
<title>Đang đăng nhập…</title>
<script>location.replace(${JSON.stringify(path)})</script>
</head>
<body>
<p>Đang đăng nhập…</p>
<p><a href="${escapeHtmlAttr(path)}">Tiếp tục</a></p>
</body>
</html>`;

  const landing = new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, no-cache, must-revalidate",
    },
  });
  appendSetCookieHeaders(cookieSource, landing);
  return landing;
}
