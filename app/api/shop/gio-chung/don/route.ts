import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createDonChungForSeller } from "@/lib/shop/don-hang";

/**
 * Checkout MỘT shop từ giỏ chung. Khác `/api/shop/don`: không trả chatContext
 * (UI buyer không mở chat) — gửi xong đơn nằm trong danh sách đơn của seller,
 * phía buyer row shop chuyển "đã gửi".
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: {
    sellerId?: unknown;
    ghiChu?: unknown;
    maDon?: unknown;
    nguoiMuaChapNhanRuiRo?: unknown;
    bienLaiAnhUrl?: unknown;
    bienLaiAnhId?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.sellerId !== "string" || !body.sellerId.trim()) {
    return NextResponse.json({ error: "Thiếu cửa hàng." }, { status: 422 });
  }
  try {
    const don = await createDonChungForSeller(session.profile.id, {
      sellerId: body.sellerId.trim(),
      ghiChu: typeof body.ghiChu === "string" ? body.ghiChu : null,
      maDon: typeof body.maDon === "string" ? body.maDon : null,
      nguoiMuaChapNhanRuiRo: body.nguoiMuaChapNhanRuiRo === true,
      bienLaiAnhUrl:
        typeof body.bienLaiAnhUrl === "string" ? body.bienLaiAnhUrl : null,
      bienLaiAnhId:
        typeof body.bienLaiAnhId === "string" ? body.bienLaiAnhId : null,
    });
    return NextResponse.json({ don }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      CART_EMPTY: [422, "Không còn hàng của cửa hàng này trong giỏ."],
      CART_SCOPE_REQUIRED: [422, "Thiếu cửa hàng."],
      CANNOT_BUY_OWN: [422, "Không thể mua hàng của chính mình."],
      BUYER_ACCEPTANCE_REQUIRED: [
        422,
        "Bạn cần xác nhận rủi ro chuyển khoản trước khi gửi đơn.",
      ],
      RECEIPT_REQUIRED: [
        422,
        "Cần đính kèm ảnh biên lai chuyển khoản trước khi gửi đơn.",
      ],
      ITEM_UNAVAILABLE: [422, "Có món đã ngừng bán — hãy gỡ khỏi giỏ."],
      STOCK_EMPTY: [422, "Có món hết hàng — hãy gỡ khỏi giỏ."],
      STOCK_INSUFFICIENT: [
        422,
        "Số lượng vượt tồn kho — giảm số lượng rồi thử lại.",
      ],
      PAYMENT_REQUIRED: [
        422,
        "Người bán chưa thêm tài khoản nhận tiền — chưa nhận đơn được.",
      ],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json({ error: "Không tạo đơn." }, { status: 500 });
  }
}
