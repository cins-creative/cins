import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import { createNode } from "@/lib/chat/canvas/nodes";
import type { CanvasNodeLayout, CanvasNodeLoai } from "@/lib/chat/canvas/types";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

const NODE_LOAI: CanvasNodeLoai[] = ["anh", "link", "sticky", "frame", "connector"];

function isLayout(value: unknown): value is CanvasNodeLayout {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as CanvasNodeLayout).x === "number" &&
    typeof (value as CanvasNodeLayout).y === "number"
  );
}

/** POST — tạo node tự do (sticky / frame / connector) trên board mặc định. */
export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const viewerId = session.profile.id;

  let body: {
    loai?: string;
    layout?: unknown;
    noiDung?: string | null;
    url?: string | null;
    messageId?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (!body.loai || !NODE_LOAI.includes(body.loai as CanvasNodeLoai)) {
    return NextResponse.json({ error: "Loại node không hợp lệ." }, { status: 400 });
  }
  if (!isLayout(body.layout)) {
    return NextResponse.json({ error: "Vị trí node không hợp lệ." }, { status: 400 });
  }

  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) {
    return NextResponse.json({ error: board.error }, { status: 403 });
  }

  const result = await createNode(board.canvas.id, viewerId, {
    loai: body.loai as CanvasNodeLoai,
    layout: body.layout,
    noiDung: body.noiDung ?? null,
    url: body.url ?? null,
    messageId: body.messageId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    node: result.node,
    notice: result.notice ?? null,
  });
}
