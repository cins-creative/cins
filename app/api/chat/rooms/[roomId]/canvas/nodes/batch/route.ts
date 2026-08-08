import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import { updateNodesLayoutBatch } from "@/lib/chat/canvas/nodes";
import type { CanvasNodeLayout } from "@/lib/chat/canvas/types";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

function isLayout(value: unknown): value is CanvasNodeLayout {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as CanvasNodeLayout).x === "number" &&
    typeof (value as CanvasNodeLayout).y === "number"
  );
}

/** PATCH — cập nhật layout hàng loạt (auto layout, căn chỉnh…). */
export async function PATCH(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const viewerId = session.profile.id;

  let body: { patches?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (!Array.isArray(body.patches) || body.patches.length === 0) {
    return NextResponse.json({ error: "Danh sách patch trống." }, { status: 400 });
  }

  const patches: Array<{ nodeId: string; layout: CanvasNodeLayout }> = [];
  for (const raw of body.patches) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Patch không hợp lệ." }, { status: 400 });
    }
    const nodeId = (raw as { nodeId?: unknown }).nodeId;
    const layout = (raw as { layout?: unknown }).layout;
    if (typeof nodeId !== "string" || !nodeId.trim()) {
      return NextResponse.json({ error: "Patch không hợp lệ." }, { status: 400 });
    }
    if (!isLayout(layout)) {
      return NextResponse.json({ error: "Vị trí node không hợp lệ." }, { status: 400 });
    }
    patches.push({ nodeId, layout });
  }

  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) {
    return NextResponse.json({ error: board.error }, { status: 403 });
  }

  const result = await updateNodesLayoutBatch(
    board.canvas.id,
    viewerId,
    patches,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ updated: result.updated });
}
