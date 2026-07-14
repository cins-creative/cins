import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { tickDueMocNotices } from "@/lib/chat/room-moc-notify";

/**
 * POST /api/chat/mocs/tick
 * Body tuỳ chọn: { roomId?: string }
 * Quét mốc tới hạn nhắc / đến giờ → tạo tin system trong phòng.
 */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { roomId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const roomId = body.roomId?.trim() || undefined;
  if (roomId) {
    try {
      await assertRoomMember(roomId, session.profile.id);
    } catch {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
  }

  const result = await tickDueMocNotices({
    roomId,
    viewerId: session.profile.id,
  });

  return NextResponse.json({
    fired: result.fired,
    messages: result.messages,
    removedMessageIds: result.removedMessageIds,
  });
}
