import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getQuanHeDetail } from "@/lib/social/ket-ban";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idNguoi = searchParams.get("id_nguoi")?.trim();
  if (!idNguoi) {
    return NextResponse.json({ error: "Thiếu id_nguoi." }, { status: 400 });
  }

  const detail = await getQuanHeDetail(session.profile.id, idNguoi);
  return NextResponse.json({
    trang_thai: detail.trangThai,
    ket_ban_id: detail.ketBanId,
  });
}
