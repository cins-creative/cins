import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  softDeleteCombo,
  updateCombo,
  type ComboDieuKienInput,
} from "@/lib/shop/combo";
import type { ShopComboPhamVi, ShopLoaiGiam } from "@/lib/shop/types";

function parseDieuKien(raw: unknown): ComboDieuKienInput[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ComboDieuKienInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const phamVi = o.phamVi as ShopComboPhamVi;
    if (
      phamVi !== "loai_hang" &&
      phamVi !== "san_pham" &&
      phamVi !== "bien_the"
    ) {
      return null;
    }
    const soLuong = Number(o.soLuong);
    if (!Number.isFinite(soLuong) || soLuong <= 0) return null;
    out.push({
      phamVi,
      idNhom: typeof o.idNhom === "string" ? o.idNhom : null,
      idSanPham: typeof o.idSanPham === "string" ? o.idSanPham : null,
      idBienThe: typeof o.idBienThe === "string" ? o.idBienThe : null,
      soLuong,
    });
  }
  return out;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 422 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const patch: Parameters<typeof updateCombo>[2] = {};
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
  if (body.apDungLap !== undefined) patch.apDungLap = body.apDungLap === true;
  if (body.kichHoat !== undefined) patch.kichHoat = body.kichHoat === true;
  if (typeof body.thuTu === "number") patch.thuTu = body.thuTu;
  if (body.batDau !== undefined) {
    patch.batDau = typeof body.batDau === "string" ? body.batDau : null;
  }
  if (body.ketThuc !== undefined) {
    patch.ketThuc = typeof body.ketThuc === "string" ? body.ketThuc : null;
  }
  if (body.dieuKien !== undefined) {
    const dk = parseDieuKien(body.dieuKien);
    if (!dk) {
      return NextResponse.json(
        { error: "Điều kiện không hợp lệ." },
        { status: 422 },
      );
    }
    patch.dieuKien = dk;
  }

  try {
    const item = await updateCombo(session.profile.id, id, patch);
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "COMBO_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy combo." }, { status: 404 });
    }
    const map: Record<string, [number, string]> = {
      COMBO_TEN_INVALID: [422, "Tên combo không hợp lệ."],
      COMBO_GIA_TRI_INVALID: [422, "Giá trị giảm không hợp lệ."],
      COMBO_THOI_GIAN_INVALID: [422, "Khoảng thời gian không hợp lệ."],
      COMBO_DIEU_KIEN_INVALID: [422, "Điều kiện không hợp lệ."],
      COMBO_DIEU_KIEN_TOO_MANY: [422, "Tối đa 4 điều kiện mua trên một combo."],
      COMBO_DIEU_KIEN_DUPLICATE: [422, "Điều kiện bị trùng."],
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
    await softDeleteCombo(session.profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "COMBO_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy combo." }, { status: 404 });
    }
    return NextResponse.json({ error: "Không xóa được." }, { status: 500 });
  }
}
