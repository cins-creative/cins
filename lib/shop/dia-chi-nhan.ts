import "server-only";

import { labelTinhThanh, normalizeTinhThanhForDb } from "@/lib/truong/contact";
import type { ShopNguoiNhanSnapshot } from "@/lib/shop/nguoi-nhan";
import { isValidPhuongXa } from "@/lib/vn/phuong-xa";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Một hồ sơ nhận hàng trong sổ địa chỉ của người mua. */
export type ShopDiaChiNhan = {
  id: string;
  nhan: string | null;
  hoTen: string;
  soDienThoai: string;
  diaChi: string;
  /** Tên phường/xã sau sát nhập (tên trần) hoặc "". */
  phuongXa: string;
  /** Mã enum tỉnh/thành (`tinh_thanh_vn_enum`) hoặc "". */
  tinhThanh: string;
  laMacDinh: boolean;
};

export type ShopDiaChiNhanInput = {
  nhan?: string | null;
  hoTen: string;
  soDienThoai: string;
  diaChi: string;
  phuongXa: string;
  tinhThanh: string;
  laMacDinh?: boolean;
};

export const MAX_DIA_CHI_NHAN = 15;
const MAX_HO_TEN = 80;
const MAX_SDT = 20;
const MAX_DIA_CHI = 280;
const MAX_NHAN = 40;
const SDT_RE = /^[0-9+()\-.\s]{6,20}$/;

type Row = {
  id: string;
  nhan: string | null;
  ho_ten: string;
  so_dien_thoai: string;
  dia_chi: string;
  phuong_xa: string | null;
  tinh_thanh: string | null;
  la_mac_dinh: boolean;
};

const SELECT =
  "id, nhan, ho_ten, so_dien_thoai, dia_chi, phuong_xa, tinh_thanh, la_mac_dinh";

function mapRow(r: Row): ShopDiaChiNhan {
  return {
    id: r.id,
    nhan: r.nhan?.trim() || null,
    hoTen: r.ho_ten,
    soDienThoai: r.so_dien_thoai,
    diaChi: r.dia_chi,
    phuongXa: (r.phuong_xa ?? "").trim(),
    tinhThanh: (r.tinh_thanh ?? "").trim(),
    laMacDinh: r.la_mac_dinh === true,
  };
}

/** Chuẩn hóa + validate. Ném `NGUOI_NHAN_REQUIRED` nếu thiếu/sai. */
function clean(input: ShopDiaChiNhanInput): {
  nhan: string | null;
  hoTen: string;
  soDienThoai: string;
  diaChi: string;
  phuongXa: string;
  tinhThanh: string;
} {
  const hoTen = (input.hoTen ?? "").trim().slice(0, MAX_HO_TEN);
  const soDienThoai = (input.soDienThoai ?? "").trim().slice(0, MAX_SDT);
  const diaChi = (input.diaChi ?? "").trim().slice(0, MAX_DIA_CHI);
  const tinhThanh = normalizeTinhThanhForDb(input.tinhThanh);
  const phuongXa = (input.phuongXa ?? "").trim();
  const nhan = (input.nhan ?? "").trim().slice(0, MAX_NHAN) || null;

  if (hoTen.length < 2) throw new Error("NGUOI_NHAN_REQUIRED");
  if (!SDT_RE.test(soDienThoai)) throw new Error("NGUOI_NHAN_REQUIRED");
  if (diaChi.length < 4) throw new Error("NGUOI_NHAN_REQUIRED");
  if (!tinhThanh) throw new Error("NGUOI_NHAN_REQUIRED");
  if (!isValidPhuongXa(tinhThanh, phuongXa)) {
    throw new Error("NGUOI_NHAN_REQUIRED");
  }

  return { nhan, hoTen, soDienThoai, diaChi, phuongXa, tinhThanh };
}

/** Danh sách hồ sơ nhận hàng (mặc định lên đầu, rồi mới nhất trước). */
export async function listDiaChiNhan(
  userId: string,
): Promise<ShopDiaChiNhan[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_dia_chi_nhan")
    .select(SELECT)
    .eq("id_nguoi_dung", userId)
    .order("la_mac_dinh", { ascending: false })
    .order("tao_luc", { ascending: false })
    .returns<Row[]>();

  return (data ?? []).map(mapRow);
}

export async function createDiaChiNhan(
  userId: string,
  input: ShopDiaChiNhanInput,
): Promise<ShopDiaChiNhan> {
  const c = clean(input);
  const admin = createServiceRoleClient();

  const { count } = await admin
    .from("shop_dia_chi_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", userId);
  if ((count ?? 0) >= MAX_DIA_CHI_NHAN) throw new Error("TOO_MANY");

  /* Hồ sơ đầu tiên luôn là mặc định. */
  const laMacDinh = input.laMacDinh === true || (count ?? 0) === 0;
  if (laMacDinh) await unsetMacDinh(userId);

  const { data, error } = await admin
    .from("shop_dia_chi_nhan")
    .insert({
      id_nguoi_dung: userId,
      nhan: c.nhan,
      ho_ten: c.hoTen,
      so_dien_thoai: c.soDienThoai,
      dia_chi: c.diaChi,
      phuong_xa: c.phuongXa,
      tinh_thanh: c.tinhThanh,
      la_mac_dinh: laMacDinh,
    })
    .select(SELECT)
    .single<Row>();
  if (error || !data) {
    console.error("[shop] createDiaChiNhan", error);
    throw new Error("CREATE_FAILED");
  }
  return mapRow(data);
}

export async function updateDiaChiNhan(
  userId: string,
  id: string,
  input: ShopDiaChiNhanInput,
): Promise<ShopDiaChiNhan> {
  const c = clean(input);
  const admin = createServiceRoleClient();

  if (input.laMacDinh === true) await unsetMacDinh(userId);

  const patch: Record<string, unknown> = {
    nhan: c.nhan,
    ho_ten: c.hoTen,
    so_dien_thoai: c.soDienThoai,
    dia_chi: c.diaChi,
    phuong_xa: c.phuongXa,
    tinh_thanh: c.tinhThanh,
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.laMacDinh === true) patch.la_mac_dinh = true;

  const { data, error } = await admin
    .from("shop_dia_chi_nhan")
    .update(patch)
    .eq("id", id)
    .eq("id_nguoi_dung", userId)
    .select(SELECT)
    .maybeSingle<Row>();
  if (error) {
    console.error("[shop] updateDiaChiNhan", error);
    throw new Error("UPDATE_FAILED");
  }
  if (!data) throw new Error("NOT_FOUND");
  return mapRow(data);
}

/** Đặt một hồ sơ làm mặc định. */
export async function setDiaChiNhanMacDinh(
  userId: string,
  id: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  await unsetMacDinh(userId);
  const { data, error } = await admin
    .from("shop_dia_chi_nhan")
    .update({ la_mac_dinh: true, cap_nhat_luc: new Date().toISOString() })
    .eq("id", id)
    .eq("id_nguoi_dung", userId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) throw new Error("UPDATE_FAILED");
  if (!data) throw new Error("NOT_FOUND");
}

export async function deleteDiaChiNhan(
  userId: string,
  id: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: removed } = await admin
    .from("shop_dia_chi_nhan")
    .delete()
    .eq("id", id)
    .eq("id_nguoi_dung", userId)
    .select("id, la_mac_dinh")
    .maybeSingle<{ id: string; la_mac_dinh: boolean }>();

  /* Nếu xóa hồ sơ mặc định → chuyển mặc định sang hồ sơ mới nhất còn lại. */
  if (removed?.la_mac_dinh) {
    const { data: next } = await admin
      .from("shop_dia_chi_nhan")
      .select("id")
      .eq("id_nguoi_dung", userId)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (next) {
      await admin
        .from("shop_dia_chi_nhan")
        .update({ la_mac_dinh: true })
        .eq("id", next.id)
        .eq("id_nguoi_dung", userId);
    }
  }
}

async function unsetMacDinh(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  await admin
    .from("shop_dia_chi_nhan")
    .update({ la_mac_dinh: false })
    .eq("id_nguoi_dung", userId)
    .eq("la_mac_dinh", true);
}

/**
 * Lấy snapshot nhận hàng từ một hồ sơ (verify ownership) để ghi vào đơn.
 * Ném `NGUOI_NHAN_REQUIRED` nếu id trống / không thuộc người mua.
 */
export async function resolveDiaChiSnapshot(
  userId: string,
  diaChiNhanId: string | null | undefined,
): Promise<ShopNguoiNhanSnapshot> {
  const id = (diaChiNhanId ?? "").trim();
  if (!id) throw new Error("NGUOI_NHAN_REQUIRED");
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_dia_chi_nhan")
    .select(SELECT)
    .eq("id", id)
    .eq("id_nguoi_dung", userId)
    .maybeSingle<Row>();
  if (!data) throw new Error("NGUOI_NHAN_REQUIRED");

  const hoTen = data.ho_ten?.trim() || "";
  const soDienThoai = data.so_dien_thoai?.trim() || "";
  const diaChi = data.dia_chi?.trim() || "";
  if (hoTen.length < 2 || !SDT_RE.test(soDienThoai) || diaChi.length < 4) {
    throw new Error("NGUOI_NHAN_REQUIRED");
  }
  const phuongXa = (data.phuong_xa ?? "").trim();
  const tinhLabel = labelTinhThanh(data.tinh_thanh);
  const diaChiDayDu = [diaChi, phuongXa, tinhLabel]
    .filter((s) => s && s.trim())
    .join(", ");
  return { hoTen, soDienThoai, diaChiDayDu };
}
