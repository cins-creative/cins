import "server-only";

import { labelTinhThanh, normalizeTinhThanhForDb } from "@/lib/truong/contact";
import type { ShopNguoiNhanSnapshot } from "@/lib/shop/nguoi-nhan";
import { getPhuongXaCode, isValidPhuongXa } from "@/lib/vn/phuong-xa";
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
  /** Mã GSO phường/xã hoặc null. */
  phuongXaCode: string | null;
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
  phuong_xa_code: string | null;
  tinh_thanh: string | null;
  la_mac_dinh: boolean;
};

const SELECT =
  "id, nhan, ho_ten, so_dien_thoai, dia_chi, phuong_xa, phuong_xa_code, tinh_thanh, la_mac_dinh";

function mapRow(r: Row): ShopDiaChiNhan {
  return {
    id: r.id,
    nhan: r.nhan?.trim() || null,
    hoTen: r.ho_ten,
    soDienThoai: r.so_dien_thoai,
    diaChi: r.dia_chi,
    phuongXa: (r.phuong_xa ?? "").trim(),
    phuongXaCode: (r.phuong_xa_code ?? "").trim() || null,
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
  phuongXaCode: string | null;
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

  return {
    nhan,
    hoTen,
    soDienThoai,
    diaChi,
    phuongXa,
    phuongXaCode: getPhuongXaCode(tinhThanh, phuongXa),
    tinhThanh,
  };
}

/**
 * Đồng bộ địa chỉ mặc định → cột hồ sơ «Thông tin nhận hàng»
 * (`ho_ten_nhan` · `so_dien_thoai` · `dia_chi_chi_tiet` · `tinh_thanh`).
 */
async function pushMacDinhToHoSo(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_dia_chi_nhan")
    .select(SELECT)
    .eq("id_nguoi_dung", userId)
    .eq("la_mac_dinh", true)
    .maybeSingle<Row>();
  if (!data) return;

  const hoTen = data.ho_ten?.trim() || "";
  const soDienThoai = data.so_dien_thoai?.trim() || "";
  const diaChi = data.dia_chi?.trim() || "";
  const tinhThanh = normalizeTinhThanhForDb(data.tinh_thanh) || null;

  await admin
    .from("user_nguoi_dung")
    .update({
      ho_ten_nhan: hoTen || null,
      so_dien_thoai: soDienThoai || null,
      dia_chi_chi_tiet: diaChi || null,
      tinh_thanh: tinhThanh,
    })
    .eq("id", userId);
}

/**
 * Đồng bộ hồ sơ «Thông tin nhận hàng» → địa chỉ mặc định trong sổ.
 * Giữ `phuong_xa` nếu còn hợp lệ với tỉnh mới; tạo mới nếu sổ còn trống.
 * Không ném — lỗi sync không chặn lưu hồ sơ.
 */
export async function syncHoSoToMacDinhDiaChi(
  userId: string,
  input: {
    hoTen: string;
    soDienThoai: string;
    diaChi: string;
    tinhThanh: string;
  },
): Promise<void> {
  const hoTen = (input.hoTen ?? "").trim().slice(0, MAX_HO_TEN);
  const soDienThoai = (input.soDienThoai ?? "").trim().slice(0, MAX_SDT);
  const diaChi = (input.diaChi ?? "").trim().slice(0, MAX_DIA_CHI);
  const tinhThanh = normalizeTinhThanhForDb(input.tinhThanh);

  /* Hồ sơ để trống hết → không đụng sổ địa chỉ. */
  if (!hoTen && !soDienThoai && !diaChi && !tinhThanh) return;
  /* Chưa đủ để tạo/sửa địa chỉ hợp lệ tối thiểu. */
  if (hoTen.length < 2 || !SDT_RE.test(soDienThoai) || diaChi.length < 4) {
    return;
  }

  const admin = createServiceRoleClient();
  const { data: macDinh } = await admin
    .from("shop_dia_chi_nhan")
    .select(SELECT)
    .eq("id_nguoi_dung", userId)
    .eq("la_mac_dinh", true)
    .maybeSingle<Row>();

  const existingPhuong = (macDinh?.phuong_xa ?? "").trim();
  const phuongXa =
    tinhThanh && isValidPhuongXa(tinhThanh, existingPhuong)
      ? existingPhuong
      : "";

  if (macDinh) {
    await admin
      .from("shop_dia_chi_nhan")
      .update({
        ho_ten: hoTen,
        so_dien_thoai: soDienThoai,
        dia_chi: diaChi,
        phuong_xa: phuongXa || null,
        tinh_thanh: tinhThanh || null,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", macDinh.id)
      .eq("id_nguoi_dung", userId);
    return;
  }

  /* Sổ trống — seed 1 địa chỉ mặc định từ hồ sơ (phường có thể trống → user bổ sung lúc checkout). */
  const { count } = await admin
    .from("shop_dia_chi_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", userId);
  if ((count ?? 0) > 0) return;

  await admin.from("shop_dia_chi_nhan").insert({
    id_nguoi_dung: userId,
    nhan: null,
    ho_ten: hoTen,
    so_dien_thoai: soDienThoai,
    dia_chi: diaChi,
    phuong_xa: null,
    tinh_thanh: tinhThanh || null,
    la_mac_dinh: true,
  });
}

/**
 * Nếu sổ trống nhưng hồ sơ đã có thông tin nhận hàng → seed 1 địa chỉ mặc định.
 * Gọi khi list checkout để hai nguồn không lệch.
 */
async function seedFromHoSoIfEmpty(userId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("shop_dia_chi_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", userId);
  if ((count ?? 0) > 0) return false;

  const { data } = await admin
    .from("user_nguoi_dung")
    .select(
      "ho_ten_nhan, ten_hien_thi, so_dien_thoai, dia_chi_chi_tiet, tinh_thanh",
    )
    .eq("id", userId)
    .maybeSingle<{
      ho_ten_nhan: string | null;
      ten_hien_thi: string | null;
      so_dien_thoai: string | null;
      dia_chi_chi_tiet: string | null;
      tinh_thanh: string | null;
    }>();

  const hoTen =
    data?.ho_ten_nhan?.trim() || data?.ten_hien_thi?.trim() || "";
  const soDienThoai = data?.so_dien_thoai?.trim() || "";
  const diaChi = data?.dia_chi_chi_tiet?.trim() || "";
  const tinhThanh = normalizeTinhThanhForDb(data?.tinh_thanh);

  if (hoTen.length < 2 || !SDT_RE.test(soDienThoai) || diaChi.length < 4) {
    return false;
  }

  const { error } = await admin.from("shop_dia_chi_nhan").insert({
    id_nguoi_dung: userId,
    nhan: null,
    ho_ten: hoTen.slice(0, MAX_HO_TEN),
    so_dien_thoai: soDienThoai.slice(0, MAX_SDT),
    dia_chi: diaChi.slice(0, MAX_DIA_CHI),
    phuong_xa: null,
    tinh_thanh: tinhThanh || null,
    la_mac_dinh: true,
  });
  return !error;
}

/** Danh sách hồ sơ nhận hàng (mặc định lên đầu, rồi mới nhất trước). */
export async function listDiaChiNhan(
  userId: string,
): Promise<ShopDiaChiNhan[]> {
  const admin = createServiceRoleClient();
  await seedFromHoSoIfEmpty(userId);

  const { data } = await admin
    .from("shop_dia_chi_nhan")
    .select(SELECT)
    .eq("id_nguoi_dung", userId)
    .order("la_mac_dinh", { ascending: false })
    .order("tao_luc", { ascending: false })
    .returns<Row[]>();

  const items = (data ?? []).map(mapRow);
  /* Giữ hồ sơ «Thông tin nhận hàng» khớp địa chỉ mặc định. */
  if (items.some((i) => i.laMacDinh)) {
    try {
      await pushMacDinhToHoSo(userId);
    } catch (e) {
      console.error("[shop] pushMacDinhToHoSo", e);
    }
  }
  return items;
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
      phuong_xa_code: c.phuongXaCode,
      tinh_thanh: c.tinhThanh,
      la_mac_dinh: laMacDinh,
    })
    .select(SELECT)
    .single<Row>();
  if (error || !data) {
    console.error("[shop] createDiaChiNhan", error);
    throw new Error("CREATE_FAILED");
  }
  const mapped = mapRow(data);
  if (mapped.laMacDinh) {
    try {
      await pushMacDinhToHoSo(userId);
    } catch (e) {
      console.error("[shop] pushMacDinhToHoSo", e);
    }
  }
  return mapped;
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
    phuong_xa_code: c.phuongXaCode,
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
  const mapped = mapRow(data);
  if (mapped.laMacDinh) {
    try {
      await pushMacDinhToHoSo(userId);
    } catch (e) {
      console.error("[shop] pushMacDinhToHoSo", e);
    }
  }
  return mapped;
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
  try {
    await pushMacDinhToHoSo(userId);
  } catch (e) {
    console.error("[shop] pushMacDinhToHoSo", e);
  }
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
    try {
      await pushMacDinhToHoSo(userId);
    } catch (e) {
      console.error("[shop] pushMacDinhToHoSo", e);
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
  const tinhThanh = (data.tinh_thanh ?? "").trim();
  const tinhLabel = labelTinhThanh(tinhThanh);
  const diaChiDayDu = [diaChi, phuongXa, tinhLabel]
    .filter((s) => s && s.trim())
    .join(", ");
  return {
    hoTen,
    soDienThoai,
    diaChiDayDu,
    diaChi,
    phuongXa,
    phuongXaCode: (data.phuong_xa_code ?? "").trim() || null,
    tinhThanh,
  };
}
