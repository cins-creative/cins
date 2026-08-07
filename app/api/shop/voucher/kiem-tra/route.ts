import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getGioChung } from "@/lib/shop/gio-chung";
import { assertVoucherApDung } from "@/lib/shop/voucher";

/**
 * POST /api/shop/voucher/kiem-tra
 * Body: { sellerId, ma } — preview giảm trên giỏ hiện tại.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { sellerId?: unknown; ma?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.sellerId !== "string" || !body.sellerId.trim()) {
    return NextResponse.json({ error: "Thiếu cửa hàng." }, { status: 422 });
  }
  if (typeof body.ma !== "string" || !body.ma.trim()) {
    return NextResponse.json({ error: "Thiếu mã voucher." }, { status: 422 });
  }

  try {
    const gio = await getGioChung(session.profile.id);
    const nhom = gio.nhom.find((n) => n.idNguoiBan === body.sellerId!.toString().trim());
    if (!nhom || nhom.dong.length === 0) {
      return NextResponse.json(
        { error: "Giỏ trống với cửa hàng này.", code: "CART_EMPTY" },
        { status: 422 },
      );
    }
    const { voucher, tienGiam } = await assertVoucherApDung(
      body.sellerId.trim(),
      session.profile.id,
      body.ma.trim(),
      nhom.tongHang,
      Math.max(0, nhom.tongHang - nhom.giamCombo),
    );
    return NextResponse.json({
      ok: true,
      tienGiam,
      tongHang: nhom.tongHang,
      giamCombo: nhom.giamCombo,
      tongTien: Math.max(0, nhom.tongHang - nhom.giamCombo - tienGiam),
      voucher,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, string> = {
      VOUCHER_KHONG_TON_TAI: "Mã voucher không tồn tại.",
      VOUCHER_KHAC_SHOP: "Voucher không thuộc cửa hàng này.",
      VOUCHER_TAT: "Voucher đã bị tắt.",
      VOUCHER_CHUA_BAT_DAU: "Voucher chưa đến ngày bắt đầu.",
      VOUCHER_HET_HAN: "Voucher đã hết hạn.",
      VOUCHER_HET_LUOT: "Voucher đã hết lượt.",
      VOUCHER_DA_DUNG: "Bạn đã dùng hết lượt voucher này.",
      VOUCHER_CHUA_DU_TOI_THIEU: "Đơn chưa đạt mức tối thiểu.",
      VOUCHER_MA_INVALID: "Mã không hợp lệ.",
      VOUCHER_KHONG_AP_DUNG: "Không thể áp voucher.",
    };
    const text = map[msg];
    if (text) {
      return NextResponse.json({ ok: false, error: text, code: msg }, { status: 409 });
    }
    return NextResponse.json({ error: "Không kiểm tra được." }, { status: 500 });
  }
}
