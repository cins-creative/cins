import { NextResponse } from "next/server";

import { listComboKichHoat } from "@/lib/shop/combo";

/**
 * GET /api/shop/combo/cong-khai?sellerId= — combo đang chạy (buyer / storefront).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId")?.trim();
  if (!sellerId) {
    return NextResponse.json({ error: "Thiếu sellerId." }, { status: 422 });
  }
  try {
    const items = await listComboKichHoat(sellerId);
    /* Chỉ trả field cần cho badge — không lộ nội bộ. */
    return NextResponse.json({
      items: items.map((c) => ({
        id: c.id,
        ten: c.ten,
        loaiGiam: c.loaiGiam,
        giaTri: c.giaTri,
        giamToiDa: c.giamToiDa,
        apDungLap: c.apDungLap,
        dieuKien: c.dieuKien.map((d) => ({
          phamVi: d.phamVi,
          soLuong: d.soLuong,
          nhan: d.nhan ?? null,
        })),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Không tải được combo." },
      { status: 500 },
    );
  }
}
