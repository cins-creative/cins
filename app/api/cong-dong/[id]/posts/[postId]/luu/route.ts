import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { saveCongDongPostBookmark } from "@/lib/cong-dong/post-bookmark";

type RouteContext = { params: Promise<{ id: string; postId: string }> };

type BookmarkBody = {
  visibility?: string;
  ghi_chu_rieng?: string | null;
};

async function handleCongDongSavePost(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập để lưu bài." }, { status: 401 });
  }

  const { id: orgId, postId } = await ctx.params;

  let body: BookmarkBody = {};
  try {
    body = await req.json();
  } catch {
    /* visibility optional */
  }

  const result = await saveCongDongPostBookmark({
    orgId,
    postId,
    viewerId: session.profile.id,
    visibility: body.visibility,
    ghiChuRieng: body.ghi_chu_rieng,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    bookmarked: result.bookmarked,
    count: result.count,
    visibility: result.visibility,
  });
}

/** POST — lưu bài cộng đồng về Journey; path tránh adblock chặn `bookmark`. */
export async function POST(req: Request, ctx: RouteContext) {
  return handleCongDongSavePost(req, ctx);
}

export { handleCongDongSavePost };
