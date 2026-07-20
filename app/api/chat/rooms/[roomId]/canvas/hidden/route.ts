import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import {
  hideMessageFromCanvas,
  unhideMessageFromCanvas,
} from "@/lib/chat/canvas/nodes";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

async function resolveCanvasId(
  roomId: string,
  viewerId: string,
): Promise<{ ok: true; canvasId: string } | { ok: false; error: string }> {
  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) return board;
  return { ok: true, canvasId: board.canvas.id };
}

/** POST — ẩn một tin khỏi canvas (không xóa tin gốc). */
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

  const canvas = await resolveCanvasId(roomId, viewerId);
  if (!canvas.ok) {
    return NextResponse.json({ error: canvas.error }, { status: 403 });
  }

  const result = await hideMessageFromCanvas(canvas.canvasId, viewerId, messageId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — bỏ ẩn tin (lần sync sau import lại). */
export async function DELETE(req: Request, context: RouteContext) {
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

  const canvas = await resolveCanvasId(roomId, viewerId);
  if (!canvas.ok) {
    return NextResponse.json({ error: canvas.error }, { status: 403 });
  }

  const result = await unhideMessageFromCanvas(canvas.canvasId, viewerId, messageId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
