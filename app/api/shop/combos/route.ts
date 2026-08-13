import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createCombo, listCombo } from "@/lib/shop/combo";
import type { ComboDieuKienInput } from "@/lib/shop/combo";
import type { ShopComboPhamVi, ShopLoaiGiam } from "@/lib/shop/types";

function parseDieuKien(raw: unknown): ComboDieuKienInput[] | null {
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

/** GET /api/shop/combo — list combo seller. */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listCombo(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Không tải được combo." },
      { status: 500 },
    );
  }
}

/** POST /api/shop/combo — tạo combo. */
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
  if (typeof body.ten !== "string") {
    return NextResponse.json({ error: "Thiếu tên combo." }, { status: 422 });
  }
  const loaiGiam = body.loaiGiam as ShopLoaiGiam;
  if (loaiGiam !== "phan_tram" && loaiGiam !== "so_tien") {
    return NextResponse.json({ error: "Loại giảm không hợp lệ." }, { status: 422 });
  }
  const giaTri = Number(body.giaTri);
  const dieuKien = parseDieuKien(body.dieuKien);
  if (!dieuKien) {
    return NextResponse.json(
      { error: "Cần ít nhất một điều kiện hợp lệ." },
      { status: 422 },
    );
  }
  try {
    const item = await createCombo(session.profile.id, {
      ten: body.ten,
      moTa: typeof body.moTa === "string" ? body.moTa : null,
      loaiGiam,
      giaTri,
      giamToiDa:
        body.giamToiDa == null || body.giamToiDa === ""
          ? null
          : Number(body.giamToiDa),
      apDungLap: body.apDungLap === true,
      batDau: typeof body.batDau === "string" ? body.batDau : null,
      ketThuc: typeof body.ketThuc === "string" ? body.ketThuc : null,
      kichHoat: body.kichHoat !== false,
      thuTu: typeof body.thuTu === "number" ? body.thuTu : 0,
      dieuKien,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      COMBO_TEN_INVALID: [422, "Tên combo không hợp lệ."],
      COMBO_MO_TA_INVALID: [422, "Mô tả quá dài."],
      COMBO_GIA_TRI_INVALID: [422, "Giá trị giảm không hợp lệ."],
      COMBO_GIAM_TOI_DA_INVALID: [422, "Trần giảm không hợp lệ."],
      COMBO_THOI_GIAN_INVALID: [422, "Khoảng thời gian không hợp lệ."],
      COMBO_DIEU_KIEN_REQUIRED: [422, "Cần ít nhất một điều kiện."],
      COMBO_DIEU_KIEN_TOO_MANY: [422, "Tối đa 4 điều kiện mua trên một combo."],
      COMBO_DIEU_KIEN_INVALID: [422, "Điều kiện không hợp lệ hoặc không thuộc shop."],
      COMBO_DIEU_KIEN_DUPLICATE: [422, "Điều kiện bị trùng."],
      BAN_HANG_OFF: [403, "Chưa bật bán hàng."],
    };
    const hit = map[msg];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json({ error: "Không tạo được combo." }, { status: 500 });
  }
}
