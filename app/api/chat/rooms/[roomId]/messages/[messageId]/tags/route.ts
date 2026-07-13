import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { setMessageTags } from "@/lib/chat/room-tags";

type RouteContext = {
  params: Promise<{ roomId: string; messageId: string }>;
};

export async function PUT(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, messageId } = await context.params;

  let body: { tagIds?: string[] };
  try {
    body = (await req.json()) as { tagIds?: string[] };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await setMessageTags(
    roomId,
    messageId,
    session.profile.id,
    Array.isArray(body.tagIds) ? body.tagIds : [],
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ tagIds: result.tagIds });
}
