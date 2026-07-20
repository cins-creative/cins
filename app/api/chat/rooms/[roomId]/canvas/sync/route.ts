import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import { listCanvasNodes } from "@/lib/chat/canvas/nodes";
import { syncCanvasFromMessages } from "@/lib/chat/canvas/sync";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/** POST — đồng bộ lại tin ảnh/URL → node và trả danh sách node mới nhất. */
export async function POST(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const viewerId = session.profile.id;

  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) {
    return NextResponse.json({ error: board.error }, { status: 403 });
  }

  const synced = await syncCanvasFromMessages(board.canvas.id, viewerId);
  if (!synced.ok) {
    return NextResponse.json({ error: synced.error }, { status: 400 });
  }

  const nodes = await listCanvasNodes(board.canvas.id, viewerId);
  if (!nodes.ok) {
    return NextResponse.json({ error: nodes.error }, { status: 403 });
  }

  return NextResponse.json({ created: synced.created, nodes: nodes.nodes });
}
