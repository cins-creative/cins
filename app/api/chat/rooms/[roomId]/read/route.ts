import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { markRoomRead } from "@/lib/chat/direct-message";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  let body: { id_tin_nhan_cuoi?: string } = {};
  try {
    const raw = await req.text();
    if (raw.trim()) {
      body = JSON.parse(raw) as { id_tin_nhan_cuoi?: string };
    }
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  try {
    await markRoomRead(roomId, session.profile.id, body.id_tin_nhan_cuoi);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }
    return NextResponse.json({ error: "Không cập nhật được trạng thái đọc." }, { status: 500 });
  }
}
