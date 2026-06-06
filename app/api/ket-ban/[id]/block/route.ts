import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { blockUser } from "@/lib/social/ket-ban";

type RouteCtx = { params: Promise<{ id: string }> };

/** `:id` = `user_nguoi_dung.id` của người bị chặn (khác record id ở route PATCH/DELETE). */
export async function POST(_req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: targetUserId } = await ctx.params;
  const result = await blockUser(session.profile.id, targetUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, trang_thai: "blocked" });
}
