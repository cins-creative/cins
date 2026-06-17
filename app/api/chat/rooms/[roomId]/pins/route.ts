import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listPinnedRoomMessages } from "@/lib/chat/message-actions-server";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;

  try {
    const pinnedMessages = await listPinnedRoomMessages(roomId, session.profile.id);
    return NextResponse.json({ pinnedMessages });
  } catch {
    return NextResponse.json({ error: "Không tải được tin ghim." }, { status: 500 });
  }
}
