import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getShopCheckoutPayment } from "@/lib/shop/cua-hang";
import { buildShopMaDon } from "@/lib/shop/ma-don";

/** GET /api/shop/cua-hang/thanh-toan?sellerId= — STK mặc định + mã đơn gợi ý (QR phía client). */
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

  /* Mã đơn gợi ý — gắn vào VietQR addInfo trước khi tạo đơn; client gửi lại khi POST. */
  let maDon: string | null = null;
  const session = await getCurrentSessionAndProfile();
  if (session?.profile) {
    const buyerLabel =
      session.profile.ten_hien_thi?.trim() ||
      session.profile.slug?.trim() ||
      "BUYER";
    maDon = buildShopMaDon(buyerLabel);
  }

  return NextResponse.json({
    banHangBat,
    maDon,
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
