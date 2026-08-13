import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getTiepCanTheoLoai } from "@/lib/shop/tiep-can-loai";

/**
 * GET /api/shop/tiep-can-loai — tiếp cận theo loại (trục 1) của shop đang đăng nhập.
 * Không nhận sellerId query (chống dò shop khác).
 */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await getTiepCanTheoLoai(session.profile.id);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[shop] tiep-can-loai", e);
    return NextResponse.json({ error: "Không tải được số liệu." }, { status: 500 });
  }
}
