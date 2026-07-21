import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createDonFromGio,
  donHangToChatContext,
  listDonHangForUser,
} from "@/lib/shop/don-hang";
import type { ShopLoaiDon } from "@/lib/shop/types";

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const roleParam = new URL(request.url).searchParams.get("role");
  const role = roleParam === "buyer" ? "buyer" : "seller";
  try {
    const items = await listDonHangForUser(session.profile.id, role);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Không tải đơn." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: {
    cotMocId?: unknown;
    cuaHangId?: unknown;
    loaiDon?: unknown;
    idSuKien?: unknown;
    ghiChu?: unknown;
    maDon?: unknown;
    nguoiMuaChapNhanRuiRo?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  const cotMocId =
    typeof body.cotMocId === "string" && body.cotMocId.trim()
      ? body.cotMocId.trim()
      : null;
  const cuaHangId =
    typeof body.cuaHangId === "string" && body.cuaHangId.trim()
      ? body.cuaHangId.trim()
      : null;
  if ((cotMocId == null) === (cuaHangId == null)) {
    return NextResponse.json(
      { error: "Cần cotMocId hoặc cuaHangId." },
      { status: 422 },
    );
  }
  const loaiDon = body.loaiDon as ShopLoaiDon;
  /* Chỉ mua ngay — đặt trước đã gỡ khỏi luồng tạo đơn. */
  if (loaiDon !== "mua_ngay") {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ mua ngay. Hàng hết tồn không đặt trước được." },
      { status: 422 },
    );
  }
  try {
    const don = await createDonFromGio(session.profile.id, {
      cotMocId,
      cuaHangId,
      loaiDon,
      idSuKien: typeof body.idSuKien === "string" ? body.idSuKien : null,
      ghiChu: typeof body.ghiChu === "string" ? body.ghiChu : null,
      maDon: typeof body.maDon === "string" ? body.maDon : null,
      nguoiMuaChapNhanRuiRo: body.nguoiMuaChapNhanRuiRo === true,
    });
    return NextResponse.json(
      { don, chatContext: donHangToChatContext(don) },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      CART_EMPTY: [422, "Giỏ hàng trống."],
      CART_SCOPE_REQUIRED: [422, "Cần cotMocId hoặc cuaHangId."],
      CANNOT_BUY_OWN: [422, "Không thể mua hàng của chính mình."],
      BUYER_ACCEPTANCE_REQUIRED: [
        422,
        "Bạn cần xác nhận rủi ro chuyển khoản trước khi gửi đơn.",
      ],
      STOCK_EMPTY: [422, "Có món hết hàng — hãy gỡ khỏi giỏ."],
      STOCK_INSUFFICIENT: [
        422,
        "Số lượng vượt tồn kho — giảm số lượng rồi thử lại.",
      ],
      LOAI_DON_UNSUPPORTED: [
        422,
        "Chỉ hỗ trợ mua ngay. Hàng hết tồn không đặt trước được.",
      ],
      POST_NOT_FOUND: [404, "Không tìm thấy bài viết."],
      SHOP_NOT_FOUND: [404, "Không tìm thấy cửa hàng."],
      PAYMENT_REQUIRED: [
        422,
        "Người bán chưa thêm tài khoản nhận tiền — chưa nhận đơn được.",
      ],
      SHOP_TAM_DONG: [
        422,
        "Shop đang tạm đóng cửa — chưa nhận đơn.",
      ],
    };
    const hit = map[msg];
    if (hit) {
      return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    }
    return NextResponse.json({ error: "Không tạo đơn." }, { status: 500 });
  }
}
