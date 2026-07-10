import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteGroupRoom } from "@/lib/chat/group-message";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  const result = await deleteGroupRoom(roomId.trim(), session.profile.id);

  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
