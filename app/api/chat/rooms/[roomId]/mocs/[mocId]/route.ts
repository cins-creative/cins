import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteRoomMoc, updateRoomMoc } from "@/lib/chat/room-moc";

type RouteContext = {
  params: Promise<{ roomId: string; mocId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, mocId } = await context.params;

  let body: {
    ten?: string;
    mo_ta?: string | null;
    thoi_diem?: string;
    url?: string | null;
    nhac_truoc_ngay?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await updateRoomMoc(roomId, mocId, session.profile.id, {
    ten: body.ten,
    moTa: body.mo_ta,
    thoiDiem: body.thoi_diem,
    url: body.url,
    nhacTruocNgay: body.nhac_truoc_ngay,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ moc: result.moc });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, mocId } = await context.params;
  const result = await deleteRoomMoc(roomId, mocId, session.profile.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
