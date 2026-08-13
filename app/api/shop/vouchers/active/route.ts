import { NextResponse } from "next/server";

import { sellerCoVoucherDangChay } from "@/lib/shop/voucher";

/** GET /api/shop/voucher/co-dang-chay?sellerId= — shop có voucher đang chạy. */
export async function GET(request: Request) {
  const sellerId = new URL(request.url).searchParams.get("sellerId")?.trim();
  if (!sellerId) {
    return NextResponse.json({ error: "Thiếu cửa hàng." }, { status: 422 });
  }
  try {
    const co = await sellerCoVoucherDangChay(sellerId);
    return NextResponse.json({ co });
  } catch {
    return NextResponse.json(
      { error: "Không kiểm tra được voucher." },
      { status: 500 },
    );
  }
}
