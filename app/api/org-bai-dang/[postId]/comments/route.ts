import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchOrgBaiDangComments } from "@/lib/truong/org-bai-dang-comments";

type RouteContext = { params: Promise<{ postId: string }> };

/** GET — cây bình luận của một bài đăng tổ chức cho viewer hiện tại. */
export async function GET(_req: Request, ctx: RouteContext) {
  const { postId } = await ctx.params;
  if (!postId) {
    return NextResponse.json({ error: "Thiếu bài đăng." }, { status: 400 });
  }

  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;

  const comments = await fetchOrgBaiDangComments(postId, viewerId);
  return NextResponse.json({ comments });
}
