import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import { pasteCanvasNodes } from "@/lib/chat/canvas/paste";
import type { CanvasClipboardNode } from "@/lib/chat/canvas/types";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/** POST — dán clipboard canvas vào board phòng (không gắn tin gốc). */
export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const viewerId = session.profile.id;

  let body: { nodes?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (!Array.isArray(body.nodes)) {
    return NextResponse.json({ error: "Thiếu nodes." }, { status: 422 });
  }

  const nodes: CanvasClipboardNode[] = [];
  for (const raw of body.nodes) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const clientKey = typeof o.clientKey === "string" ? o.clientKey.trim() : "";
    const loai = typeof o.loai === "string" ? o.loai : "";
    if (!clientKey || !loai) continue;
    const layout =
      o.layout && typeof o.layout === "object"
        ? (o.layout as CanvasClipboardNode["layout"])
        : { x: 0, y: 0 };
    nodes.push({
      clientKey,
      loai: loai as CanvasClipboardNode["loai"],
      url: typeof o.url === "string" ? o.url : null,
      noiDung: typeof o.noiDung === "string" ? o.noiDung : null,
      layout,
    });
  }

  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) {
    return NextResponse.json({ error: board.error }, { status: 403 });
  }

  const result = await pasteCanvasNodes(board.canvas.id, viewerId, nodes);
  if (!result.ok) {
    const status =
      result.error.includes("tối đa") || result.error.includes("Không có")
        ? 400
        : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ nodes: result.nodes });
}
