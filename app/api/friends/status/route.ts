import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getQuanHeDetail,
  getQuanHeDetailsBatch,
} from "@/lib/social/ket-ban";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idsRaw = searchParams.get("ids")?.trim();
  if (idsRaw) {
    const ids = idsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    const map = await getQuanHeDetailsBatch(session.profile.id, ids);
    const items: Record<
      string,
      {
        trang_thai: string;
        ket_ban_id: string | null;
        chan_boi_toi: boolean;
      }
    > = {};
    for (const [id, detail] of map) {
      items[id] = {
        trang_thai: detail.trangThai,
        ket_ban_id: detail.ketBanId,
        chan_boi_toi: detail.blockedByMe,
      };
    }
    return NextResponse.json({ items });
  }

  const idNguoi = searchParams.get("id_nguoi")?.trim();
  if (!idNguoi) {
    return NextResponse.json(
      { error: "Thiếu id_nguoi hoặc ids." },
      { status: 400 },
    );
  }

  const detail = await getQuanHeDetail(session.profile.id, idNguoi);
  return NextResponse.json({
    trang_thai: detail.trangThai,
    ket_ban_id: detail.ketBanId,
    chan_boi_toi: detail.blockedByMe,
  });
}
