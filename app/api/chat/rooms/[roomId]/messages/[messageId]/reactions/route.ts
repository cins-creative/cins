import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { toggleChatMessageReaction } from "@/lib/chat/message-actions-server";

type RouteContext = {
  params: Promise<{ roomId: string; messageId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, messageId } = await context.params;

  let body: { emoji?: string; active?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await toggleChatMessageReaction(
    roomId,
    session.profile.id,
    messageId,
    body.emoji ?? "",
    Boolean(body.active),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ reactions: result.reactions });
}
