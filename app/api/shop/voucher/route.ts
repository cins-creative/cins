import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createVoucher,
  listVoucher,
  type VoucherCreateInput,
} from "@/lib/shop/voucher";
import type { ShopLoaiGiam, ShopVoucherDesign } from "@/lib/shop/types";

function parseCreateBody(body: Record<string, unknown>): VoucherCreateInput | null {
  if (typeof body.ma !== "string" || typeof body.ten !== "string") return null;
  const loaiGiam = body.loaiGiam as ShopLoaiGiam;
  if (loaiGiam !== "phan_tram" && loaiGiam !== "so_tien") return null;
  const giaTri = Number(body.giaTri);
  if (!Number.isFinite(giaTri)) return null;
  return {
    ma: body.ma,
    ten: body.ten,
    moTa: typeof body.moTa === "string" ? body.moTa : null,
    loaiGiam,
    giaTri,
    giamToiDa:
      body.giamToiDa == null || body.giamToiDa === ""
        ? null
        : Number(body.giamToiDa),
    donToiThieu:
      body.donToiThieu == null ? 0 : Number(body.donToiThieu),
    soLuongTong:
      body.soLuongTong == null || body.soLuongTong === ""
        ? null
        : Number(body.soLuongTong),
    gioiHanMoiNguoi:
      body.gioiHanMoiNguoi == null ? 1 : Number(body.gioiHanMoiNguoi),
    batDau: typeof body.batDau === "string" ? body.batDau : null,
    ketThuc: typeof body.ketThuc === "string" ? body.ketThuc : null,
    kichHoat: body.kichHoat !== false,
    congKhai: body.congKhai !== false,
    designKieu:
      body.designKieu === "rieng" ? "rieng" : ("mac_dinh" as ShopVoucherDesign),
    designAnhId: typeof body.designAnhId === "string" ? body.designAnhId : null,
    designMauNen:
      typeof body.designMauNen === "string" ? body.designMauNen : null,
    designMauChu:
      typeof body.designMauChu === "string" ? body.designMauChu : null,
    designNhan: typeof body.designNhan === "string" ? body.designNhan : null,
  };
}

/** GET /api/shop/voucher — list voucher seller. */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listVoucher(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Không tải được voucher." },
      { status: 500 },
    );
  }
}

/** POST /api/shop/voucher — tạo voucher. */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  const input = parseCreateBody(body);
  if (!input) {
    return NextResponse.json({ error: "Thiếu mã / tên / loại giảm." }, { status: 422 });
  }
  try {
    const item = await createVoucher(session.profile.id, input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      VOUCHER_MA_INVALID: [422, "Mã phải 3–20 ký tự A–Z / 0–9."],
      VOUCHER_MA_DUPLICATE: [409, "Mã voucher đã tồn tại."],
      VOUCHER_TEN_INVALID: [422, "Tên không hợp lệ."],
      VOUCHER_GIA_TRI_INVALID: [422, "Giá trị giảm không hợp lệ."],
      VOUCHER_THOI_GIAN_INVALID: [422, "Khoảng thời gian không hợp lệ."],
      VOUCHER_SO_LUONG_INVALID: [422, "Số lượng không hợp lệ."],
      VOUCHER_DESIGN_INVALID: [422, "Design không hợp lệ."],
      BAN_HANG_OFF: [403, "Chưa bật bán hàng."],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json({ error: "Không tạo được voucher." }, { status: 500 });
  }
}
