import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createDonChungForSeller } from "@/lib/shop/don-hang";

/**
 * Checkout MỘT shop từ giỏ chung. Tự gửi card đơn (+ biên lai) vào inbox
 * chat seller phía server; UI buyer giữ panel / row "đã gửi" (không bắt mở chat).
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
    maVoucher?: unknown;
    nguoiMuaChapNhanRuiRo?: unknown;
    bienLaiAnhUrl?: unknown;
    bienLaiAnhId?: unknown;
    diaChiNhanId?: unknown;
    hinhThucGiao?: unknown;
    phienId?: unknown;
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
      diaChiNhanId:
        typeof body.diaChiNhanId === "string" ? body.diaChiNhanId : null,
      hinhThucGiao:
        body.hinhThucGiao === "online"
          ? "online"
          : body.hinhThucGiao === "tai_su_kien"
            ? "tai_su_kien"
            : "truc_tiep",
      maVoucher: typeof body.maVoucher === "string" ? body.maVoucher : null,
      phienIdRaw: typeof body.phienId === "string" ? body.phienId : null,
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
      NGUOI_NHAN_REQUIRED: [
        422,
        "Cần nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.",
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
      SHOP_TAM_DONG: [
        422,
        "Shop đang tạm đóng cửa — chưa nhận đơn.",
      ],
      SHOP_KHOA: [
        422,
        "Shop đang bị khóa bởi nền tảng (nợ phí / tranh chấp) — chưa nhận đơn.",
      ],
      BLOCKED: [403, "Không thể gửi đơn tới cửa hàng này."],
      SOFT_LIMIT_CHO_XAC_NHAN: [
        429,
        "Bạn đang có quá nhiều đơn chờ shop xác nhận. Hủy bớt hoặc đợi shop xử lý.",
      ],
      SOFT_LIMIT_CHO_XAC_NHAN_SHOP: [
        429,
        "Bạn đang có quá nhiều đơn chờ xác nhận với shop này.",
      ],
      SOFT_LIMIT_MOI_NGAY: [
        429,
        "Bạn đã tạo quá nhiều đơn hôm nay. Thử lại vào ngày mai.",
      ],
      CREATE_LIMIT_CHECK_FAILED: [
        503,
        "Không kiểm tra được hạn mức đơn. Thử lại sau.",
      ],
      VOUCHER_KHONG_TON_TAI: [409, "Mã voucher không tồn tại."],
      VOUCHER_KHAC_SHOP: [422, "Voucher không thuộc cửa hàng này."],
      VOUCHER_TAT: [409, "Voucher đã bị tắt."],
      VOUCHER_CHUA_BAT_DAU: [409, "Voucher chưa đến ngày bắt đầu."],
      VOUCHER_HET_HAN: [409, "Voucher đã hết hạn."],
      VOUCHER_HET_LUOT: [409, "Voucher đã hết lượt sử dụng."],
      VOUCHER_DA_DUNG: [409, "Bạn đã dùng hết lượt voucher này."],
      VOUCHER_CHUA_DU_TOI_THIEU: [
        409,
        "Đơn chưa đạt mức tối thiểu để dùng voucher.",
      ],
      VOUCHER_MA_INVALID: [422, "Mã voucher không hợp lệ."],
      VOUCHER_KHONG_AP_DUNG: [409, "Không thể áp voucher trên đơn này."],
      VOUCHER_DUNG_FAILED: [409, "Không giữ được lượt voucher — thử lại."],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json({ error: "Không tạo đơn." }, { status: 500 });
  }
}
