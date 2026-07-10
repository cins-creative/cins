import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { updateGroupRoomAvatar } from "@/lib/chat/group-message";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  let body: { avatarId?: string | null; avatar_id?: string | null };
  try {
    body = (await req.json()) as { avatarId?: string | null; avatar_id?: string | null };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const avatarId =
    body.avatarId !== undefined ? body.avatarId : (body.avatar_id ?? null);

  const result = await updateGroupRoomAvatar(
    roomId.trim(),
    session.profile.id,
    avatarId,
  );

  if (!result.ok) {
    const status = result.error.includes("quyền") || result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ thread: result.thread });
}
