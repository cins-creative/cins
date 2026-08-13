import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { sendFriendRequest } from "@/lib/social/ket-ban";

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_nguoi_nhan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const idNguoiNhan = body.id_nguoi_nhan?.trim();
  if (!idNguoiNhan) {
    return NextResponse.json({ error: "Thiếu id_nguoi_nhan." }, { status: 400 });
  }

  const result = await sendFriendRequest(session.profile.id, idNguoiNhan);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: result.data.id,
    trang_thai: "pending_sent",
  });
}
