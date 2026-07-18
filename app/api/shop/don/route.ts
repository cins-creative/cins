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
  if (typeof body.cotMocId !== "string") {
    return NextResponse.json({ error: "Thiếu cotMocId." }, { status: 422 });
  }
  const loaiDon = body.loaiDon as ShopLoaiDon;
  if (loaiDon !== "mua_ngay" && loaiDon !== "dat_truoc_nhan_su_kien") {
    return NextResponse.json({ error: "loaiDon không hợp lệ." }, { status: 422 });
  }
  try {
    const don = await createDonFromGio(session.profile.id, {
      cotMocId: body.cotMocId,
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
      CANNOT_BUY_OWN: [422, "Không thể mua hàng của chính mình."],
      BUYER_ACCEPTANCE_REQUIRED: [
        422,
        "Bạn cần xác nhận rủi ro chuyển khoản trước khi gửi đơn.",
      ],
      STOCK_EMPTY: [
        422,
        "Có món hết hàng — chỉ đặt trước được.",
      ],
      STOCK_INSUFFICIENT: [
        422,
        "Số lượng vượt tồn kho — giảm SL hoặc chọn Đặt trước.",
      ],
      POST_NOT_FOUND: [404, "Không tìm thấy bài viết."],
    };
    const hit = map[msg];
    if (hit) {
      return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    }
    return NextResponse.json({ error: "Không tạo đơn." }, { status: 500 });
  }
}
