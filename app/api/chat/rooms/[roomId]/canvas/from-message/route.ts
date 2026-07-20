import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { addMessageToCanvas } from "@/lib/chat/canvas/add-message";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/** POST — thêm một tin nhắn lên canvas phòng (ảnh / link / sticky). */
export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const viewerId = session.profile.id;

  let body: { messageId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const messageId = body.messageId?.trim();
  if (!messageId) {
    return NextResponse.json({ error: "Thiếu messageId." }, { status: 400 });
  }

  const result = await addMessageToCanvas(roomId, viewerId, messageId);
  if (!result.ok) {
    const status = result.error === "Không có quyền." ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ node: result.node, created: result.created });
}
