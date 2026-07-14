import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { createRoomPoll, loadPollsForMessages } from "@/lib/chat/room-poll";
import type { ChatPollSummary } from "@/lib/chat/types";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  try {
    await assertRoomMember(roomId, session.profile.id);
  } catch {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const messageIds = (searchParams.get("messageIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 40);

  if (!messageIds.length) {
    return NextResponse.json({ polls: {} satisfies Record<string, ChatPollSummary> });
  }

  const map = await loadPollsForMessages(messageIds, session.profile.id);
  const polls: Record<string, ChatPollSummary> = {};
  for (const [messageId, poll] of map) {
    polls[messageId] = poll;
  }
  return NextResponse.json({ polls });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;

  let body: { cau_hoi?: string; lua_chon?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await createRoomPoll(roomId, session.profile.id, {
    question: body.cau_hoi ?? "",
    options: Array.isArray(body.lua_chon) ? body.lua_chon : [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ message: result.message });
}
