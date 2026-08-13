import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { getLopRoomAccess } from "@/lib/co-so/lop-room-access";

type Ctx = { params: Promise<{ roomId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  try {
    await assertRoomMember(roomId, session.profile.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const access = await getLopRoomAccess(roomId, session.profile.id);
  return NextResponse.json(access);
}
