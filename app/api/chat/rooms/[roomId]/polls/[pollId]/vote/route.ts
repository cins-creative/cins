import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { castRoomPollVote } from "@/lib/chat/room-poll";

type RouteContext = {
  params: Promise<{ roomId: string; pollId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, pollId } = await context.params;

  let body: { id_lua_chon?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const optionId = body.id_lua_chon?.trim() || "";
  if (!optionId) {
    return NextResponse.json({ error: "Thiếu lựa chọn." }, { status: 400 });
  }

  const result = await castRoomPollVote(
    roomId,
    pollId,
    session.profile.id,
    optionId,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ poll: result.poll });
}
