import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getRoomRole } from "@/lib/chat/canvas/access";
import {
  getOrCreateRoomCanvas,
  setCanvasCheDoSaoChep,
  setCanvasTrangThai,
  updateCanvasMeta,
} from "@/lib/chat/canvas/boards";
import { listCanvasNodes } from "@/lib/chat/canvas/nodes";
import { syncCanvasFromMessages } from "@/lib/chat/canvas/sync";
import type {
  CanvasCheDoSaoChep,
  CanvasTrangThai,
} from "@/lib/chat/canvas/types";
import { canManageGroupChat } from "@/lib/chat/group-roles";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

const TRANG_THAI: CanvasTrangThai[] = ["active", "khoa", "an"];
const CHE_DO: CanvasCheDoSaoChep[] = ["private", "public"];

/** GET — lấy/tạo board mặc định của phòng, đồng bộ tin ảnh/URL, trả node. */
export async function GET(_req: Request, context: RouteContext) {
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

  const role = await getRoomRole(roomId, viewerId);
  const canManage = Boolean(role && canManageGroupChat(role));

  const [syncResult, listed] = await Promise.all([
    syncCanvasFromMessages(board.canvas.id, viewerId),
    listCanvasNodes(board.canvas.id, viewerId),
  ]);

  if (!listed.ok) {
    return NextResponse.json({ error: listed.error }, { status: 403 });
  }

  let nodes = listed.nodes;
  if (syncResult.ok && syncResult.created > 0) {
    const fresh = await listCanvasNodes(board.canvas.id, viewerId);
    if (fresh.ok) nodes = fresh.nodes;
  }

  return NextResponse.json({
    canvas: board.canvas,
    nodes,
    canManage,
  });
}

/** PATCH — meta / trangThai / cheDoSaoChep. */
export async function PATCH(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const viewerId = session.profile.id;

  let body: {
    ten?: string;
    moTa?: string | null;
    trangThai?: string;
    cheDoSaoChep?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) {
    return NextResponse.json({ error: board.error }, { status: 403 });
  }

  if (body.cheDoSaoChep !== undefined) {
    if (!CHE_DO.includes(body.cheDoSaoChep as CanvasCheDoSaoChep)) {
      return NextResponse.json(
        { error: "Chế độ sao chép không hợp lệ." },
        { status: 400 },
      );
    }
    const result = await setCanvasCheDoSaoChep(
      board.canvas.id,
      viewerId,
      body.cheDoSaoChep as CanvasCheDoSaoChep,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ canvas: result.canvas });
  }

  if (body.trangThai !== undefined) {
    if (!TRANG_THAI.includes(body.trangThai as CanvasTrangThai)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    const result = await setCanvasTrangThai(
      board.canvas.id,
      viewerId,
      body.trangThai as CanvasTrangThai,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ canvas: result.canvas });
  }

  const result = await updateCanvasMeta(board.canvas.id, viewerId, {
    ten: body.ten,
    moTa: body.moTa,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ canvas: result.canvas });
}
