import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteRoomTag } from "@/lib/chat/room-tags";

type RouteContext = {
  params: Promise<{ roomId: string; tagId: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, tagId } = await context.params;
  const result = await deleteRoomTag(roomId, tagId, session.profile.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
