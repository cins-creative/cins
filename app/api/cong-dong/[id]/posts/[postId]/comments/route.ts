import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { addThaoLuanComment, listThaoLuanComments } from "@/lib/cong-dong/posts";

type RouteContext = { params: Promise<{ id: string; postId: string }> };

/** GET — danh sách bình luận cấp 1. */
export async function GET(_req: Request, ctx: RouteContext) {
  const { postId } = await ctx.params;
  const comments = await listThaoLuanComments(postId);
  return NextResponse.json({ comments });
}

/** POST — thêm bình luận. */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { postId } = await ctx.params;

  let body: { noi_dung?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await addThaoLuanComment({
    postId,
    authorId: session.profile.id,
    noiDung: body.noi_dung ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, comment: result.data });
}
