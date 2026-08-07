import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  softDeleteVoucher,
  updateVoucher,
  type VoucherCreateInput,
} from "@/lib/shop/voucher";
import type { ShopLoaiGiam, ShopVoucherDesign } from "@/lib/shop/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const patch: Partial<VoucherCreateInput> & { kichHoat?: boolean } = {};
  if (typeof body.ma === "string") patch.ma = body.ma;
  if (typeof body.ten === "string") patch.ten = body.ten;
  if (body.moTa !== undefined) {
    patch.moTa = typeof body.moTa === "string" ? body.moTa : null;
  }
  if (body.loaiGiam === "phan_tram" || body.loaiGiam === "so_tien") {
    patch.loaiGiam = body.loaiGiam as ShopLoaiGiam;
  }
  if (body.giaTri !== undefined) patch.giaTri = Number(body.giaTri);
  if (body.giamToiDa !== undefined) {
    patch.giamToiDa =
      body.giamToiDa == null || body.giamToiDa === ""
        ? null
        : Number(body.giamToiDa);
  }
  if (body.donToiThieu !== undefined) {
    patch.donToiThieu = Number(body.donToiThieu);
  }
  if (body.soLuongTong !== undefined) {
    patch.soLuongTong =
      body.soLuongTong == null || body.soLuongTong === ""
        ? null
        : Number(body.soLuongTong);
  }
  if (body.gioiHanMoiNguoi !== undefined) {
    patch.gioiHanMoiNguoi = Number(body.gioiHanMoiNguoi);
  }
  if (body.batDau !== undefined) {
    patch.batDau = typeof body.batDau === "string" ? body.batDau : null;
  }
  if (body.ketThuc !== undefined) {
    patch.ketThuc = typeof body.ketThuc === "string" ? body.ketThuc : null;
  }
  if (body.kichHoat !== undefined) patch.kichHoat = body.kichHoat === true;
  if (body.congKhai !== undefined) patch.congKhai = body.congKhai === true;
  if (body.designKieu === "mac_dinh" || body.designKieu === "rieng") {
    patch.designKieu = body.designKieu as ShopVoucherDesign;
  }
  if (body.designAnhId !== undefined) {
    patch.designAnhId =
      typeof body.designAnhId === "string" ? body.designAnhId : null;
  }
  if (body.designMauNen !== undefined) {
    patch.designMauNen =
      typeof body.designMauNen === "string" ? body.designMauNen : null;
  }
  if (body.designMauChu !== undefined) {
    patch.designMauChu =
      typeof body.designMauChu === "string" ? body.designMauChu : null;
  }
  if (body.designNhan !== undefined) {
    patch.designNhan =
      typeof body.designNhan === "string" ? body.designNhan : null;
  }

  try {
    const item = await updateVoucher(session.profile.id, id, patch);
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "VOUCHER_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy voucher." }, { status: 404 });
    }
    const map: Record<string, [number, string]> = {
      VOUCHER_MA_DUPLICATE: [409, "Mã voucher đã tồn tại."],
      VOUCHER_MA_INVALID: [422, "Mã không hợp lệ."],
      VOUCHER_SO_LUONG_TOO_LOW: [
        422,
        "Số lượng tổng không được nhỏ hơn số đã dùng.",
      ],
      VOUCHER_GIA_TRI_INVALID: [422, "Giá trị giảm không hợp lệ."],
      BAN_HANG_OFF: [403, "Chưa bật bán hàng."],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await softDeleteVoucher(session.profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "VOUCHER_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy voucher." }, { status: 404 });
    }
    return NextResponse.json({ error: "Không xóa được." }, { status: 500 });
  }
}
