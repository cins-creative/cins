import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { saveCongDongPostBookmark } from "@/lib/cong-dong/post-bookmark";

type RouteContext = { params: Promise<{ id: string; postId: string }> };

type BookmarkBody = {
  visibility?: string;
};

/** POST — lưu bài cộng đồng về Journey (cot_moc); chỉ thành viên nhóm. */
export async function POST(req: Request, ctx: RouteContext) {
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
