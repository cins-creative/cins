import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createRoomMoc, listRoomMocs } from "@/lib/chat/room-moc";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const result = await listRoomMocs(roomId, session.profile.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ mocs: result.mocs });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;

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

  const result = await createRoomMoc(roomId, session.profile.id, {
    ten: body.ten ?? "",
    moTa: body.mo_ta,
    thoiDiem: body.thoi_diem ?? "",
    url: body.url,
    nhacTruocNgay: body.nhac_truoc_ngay,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ moc: result.moc });
}
