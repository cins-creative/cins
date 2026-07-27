import { NextResponse } from "next/server";

import { pixivImageFetchHeaders } from "@/lib/autopilot/pixiv-assets";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/**
 * GET /api/admin/autopilot/pixiv-proxy?u=https://i.pximg.net/...
 * Trình duyệt không gửi Referer Pixiv → proxy server-side (admin only).
 */
export async function GET(req: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const raw = new URL(req.url).searchParams.get("u")?.trim() || "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }
  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "Chỉ https." }, { status: 400 });
  }
  if (!/^i\.pximg\.net$/i.test(target.hostname)) {
    return NextResponse.json(
      { error: "Chỉ cho phép i.pximg.net." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: pixivImageFetchHeaders(),
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Pixiv HTTP ${upstream.status}` },
        { status: 502 },
      );
    }
    const buf = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("content-type") || "image/jpeg";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Không tải được ảnh Pixiv." },
      { status: 502 },
    );
  }
}
