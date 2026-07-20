import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteNode, updateNode } from "@/lib/chat/canvas/nodes";
import type { CanvasNodeLayout } from "@/lib/chat/canvas/types";

type RouteContext = {
  params: Promise<{ roomId: string; nodeId: string }>;
};

function isLayout(value: unknown): value is CanvasNodeLayout {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as CanvasNodeLayout).x === "number" &&
    typeof (value as CanvasNodeLayout).y === "number"
  );
}

/** PATCH — cập nhật vị trí (layout) hoặc nội dung sticky. */
export async function PATCH(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { nodeId } = await context.params;
  const viewerId = session.profile.id;

  let body: { layout?: unknown; noiDung?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const patch: { layout?: CanvasNodeLayout; noiDung?: string | null } = {};
  if (body.layout !== undefined) {
    if (!isLayout(body.layout)) {
      return NextResponse.json({ error: "Vị trí node không hợp lệ." }, { status: 400 });
    }
    patch.layout = body.layout;
  }
  if (body.noiDung !== undefined) {
    patch.noiDung = body.noiDung;
  }

  const result = await updateNode(nodeId, viewerId, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ node: result.node });
}

/** DELETE — xóa node (mọi thành viên ghi được). Ảnh canvas-only → xóa CF. */
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { nodeId } = await context.params;
  const result = await deleteNode(nodeId, session.profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
