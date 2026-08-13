import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  addGioChungDong,
  clearGioChung,
  getGioChung,
  setGioChungDong,
} from "@/lib/shop/gio-chung";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const gio = await getGioChung(session.profile.id);
    return NextResponse.json({ gio });
  } catch {
    return NextResponse.json({ error: "Không tải giỏ." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { idBienThe?: unknown; soLuong?: unknown; delta?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.idBienThe !== "string") {
    return NextResponse.json({ error: "Thiếu trường." }, { status: 422 });
  }
  const hasSoLuong = typeof body.soLuong === "number";
  const hasDelta = typeof body.delta === "number";
  if (hasSoLuong === hasDelta) {
    return NextResponse.json(
      { error: "Cần đúng một trong soLuong hoặc delta." },
      { status: 422 },
    );
  }
  try {
    const gio = hasDelta
      ? await addGioChungDong(
          session.profile.id,
          body.idBienThe.trim(),
          body.delta as number,
        )
      : await setGioChungDong(
          session.profile.id,
          body.idBienThe.trim(),
          body.soLuong as number,
        );
    return NextResponse.json({ gio });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      ITEM_NOT_FOUND: [404, "Không tìm thấy mặt hàng."],
      ITEM_UNAVAILABLE: [422, "Mặt hàng đã ngừng bán."],
      CANNOT_BUY_OWN: [422, "Không thể mua hàng của chính mình."],
      STOCK_EMPTY: [422, "Hết hàng — không thêm vào giỏ được."],
      STOCK_INSUFFICIENT: [422, "Số lượng vượt tồn kho."],
      INVALID_QTY: [422, "Số lượng không hợp lệ."],
      SHOP_TAM_DONG: [
        422,
        "Shop đang tạm đóng cửa — chưa nhận đơn.",
      ],
      CART_FAILED: [
        500,
        "Chưa tạo được giỏ chung — cần chạy migration shop_gio (giỏ chung).",
      ],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json({ error: "Không cập nhật giỏ." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const gio = await clearGioChung(session.profile.id);
    return NextResponse.json({ gio });
  } catch {
    return NextResponse.json({ error: "Không xóa giỏ." }, { status: 500 });
  }
}
