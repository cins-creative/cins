import { NextResponse } from "next/server";

import { getShopCheckoutPayment } from "@/lib/shop/cua-hang";

/** GET /api/shop/cua-hang/thanh-toan?sellerId= — STK mặc định cho checkout (QR tự tạo phía client). */
export async function GET(request: Request) {
  const sellerId = new URL(request.url).searchParams.get("sellerId")?.trim();
  if (!sellerId) {
    return NextResponse.json({ error: "Thiếu sellerId." }, { status: 400 });
  }

  const { shop, payment, banHangBat } = await getShopCheckoutPayment(sellerId);
  if (!banHangBat) {
    return NextResponse.json(
      { error: "Người bán chưa mở cửa hàng.", payment: null, shop: null },
      { status: 404 },
    );
  }

  return NextResponse.json({
    banHangBat,
    shop: shop
      ? {
          id: shop.id,
          ten: shop.ten,
          chinhSach: shop.chinhSach,
          lienHe: shop.lienHe,
          avatarUrl: shop.avatarUrl,
          sanSangNhanDon: shop.sanSangNhanDon,
        }
      : null,
    payment: payment
      ? {
          id: payment.id,
          nganHang: payment.nganHang,
          soTaiKhoan: payment.soTaiKhoan,
          tenChuTaiKhoan: payment.tenChuTaiKhoan,
        }
      : null,
  });
}
