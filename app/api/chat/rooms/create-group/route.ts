import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createGroupRoom } from "@/lib/chat/group-message";

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_thanh_vien?: string[]; ten_phong?: string };
  try {
    body = (await req.json()) as { id_thanh_vien?: string[]; ten_phong?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const memberIds = Array.isArray(body.id_thanh_vien) ? body.id_thanh_vien : [];
  const tenPhong = body.ten_phong?.trim() || null;

  const result = await createGroupRoom(session.profile.id, memberIds, tenPhong);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ thread: result.thread });
}
