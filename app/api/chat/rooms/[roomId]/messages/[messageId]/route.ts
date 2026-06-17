import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  editRoomMessage,
  recallRoomMessage,
  setMessagePinned,
} from "@/lib/chat/message-actions-server";

type RouteContext = {
  params: Promise<{ roomId: string; messageId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, messageId } = await context.params;

  let body: { action?: string; noi_dung?: string; pinned?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const action = body.action?.trim();

  if (action === "recall") {
    const result = await recallRoomMessage(roomId, session.profile.id, messageId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ message: result.message });
  }

  if (action === "edit") {
    const result = await editRoomMessage(
      roomId,
      session.profile.id,
      messageId,
      body.noi_dung ?? "",
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ message: result.message });
  }

  if (action === "pin") {
    const result = await setMessagePinned(
      roomId,
      session.profile.id,
      messageId,
      Boolean(body.pinned),
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ pinned: result.pinned });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
