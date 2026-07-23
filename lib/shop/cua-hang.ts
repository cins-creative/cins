import "server-only";

import {
  shopPublicHref as buildShopPublicHref,
  shopSlugFromTen as buildShopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import {
  getBanHangEnabled,
  setBanHangEnabled,
  shopImageUrl,
} from "@/lib/shop/settings";
import type {
  ShopCuaHang,
  ShopPhuongThucTt,
  ShopThanhToanSnapshot,
} from "@/lib/shop/types";
import { isShopTamDongActive, normalizeShopTamDongLyDo } from "@/lib/shop/tam-dong";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CuaHangRow = {
  id: string;
  id_nguoi_dung: string;
  ten: string | null;
  mo_ta: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  banner_su_kien_id: string | null;
  banner_su_kien_hien: boolean | null;
  chinh_sach: string | null;
  lien_he: string | null;
  nhan_phan_loai: string | null;
  nhan_phan_loai_2: string | null;
  tam_dong: boolean | null;
  tam_dong_tu: string | null;
  tam_dong_den: string | null;
  tam_dong_ly_do: string | null;
  da_xoa: boolean | null;
  tao_luc: string;
  cap_nhat_luc: string;
};

type PtttRow = {
  id: string;
  id_cua_hang: string;
  ngan_hang: string;
  so_tai_khoan: string;
  ten_chu_tai_khoan: string;
  qr_anh_id: string | null;
  mac_dinh: boolean;
  kich_hoat: boolean;
  thu_tu: number;
  tao_luc: string;
};

const CUA_HANG_SELECT =
  "id, id_nguoi_dung, ten, mo_ta, avatar_id, cover_id, banner_su_kien_id, banner_su_kien_hien, chinh_sach, lien_he, nhan_phan_loai, nhan_phan_loai_2, tam_dong, tam_dong_tu, tam_dong_den, tam_dong_ly_do, da_xoa, tao_luc, cap_nhat_luc";

const PTTT_SELECT =
  "id, id_cua_hang, ngan_hang, so_tai_khoan, ten_chu_tai_khoan, qr_anh_id, mac_dinh, kich_hoat, thu_tu, tao_luc";

function mapPttt(row: PtttRow): ShopPhuongThucTt {
  return {
    id: row.id,
    idCuaHang: row.id_cua_hang,
    nganHang: row.ngan_hang,
    soTaiKhoan: row.so_tai_khoan,
    tenChuTaiKhoan: row.ten_chu_tai_khoan,
    qrAnhId: row.qr_anh_id,
    qrAnhUrl: shopImageUrl(row.qr_anh_id),
    macDinh: row.mac_dinh === true,
    kichHoat: row.kich_hoat === true,
    thuTu: row.thu_tu,
    taoLuc: row.tao_luc,
  };
}

function mapCuaHang(row: CuaHangRow, pttt: ShopPhuongThucTt[]): ShopCuaHang {
  return {
    id: row.id,
    idNguoiDung: row.id_nguoi_dung,
    ten: row.ten,
    moTa: row.mo_ta,
    avatarId: row.avatar_id,
    avatarUrl: shopImageUrl(row.avatar_id),
    coverId: row.cover_id,
    coverUrl: shopImageUrl(row.cover_id),
    bannerSuKienId: row.banner_su_kien_id,
    bannerSuKienUrl: shopImageUrl(row.banner_su_kien_id),
    bannerSuKienHien: row.banner_su_kien_hien !== false,
    chinhSach: row.chinh_sach,
    lienHe: row.lien_he,
    nhanPhanLoai: row.nhan_phan_loai?.trim() || null,
    nhanPhanLoai2: row.nhan_phan_loai_2?.trim() || null,
    tamDong: row.tam_dong === true,
    tamDongTu: row.tam_dong_tu ?? null,
    tamDongDen: row.tam_dong_den ?? null,
    tamDongLyDo: row.tam_dong_ly_do?.trim() || null,
    phuongThucTt: pttt,
    sanSangNhanDon: pttt.some(
      (p) =>
        p.kichHoat &&
        Boolean(p.nganHang.trim()) &&
        Boolean(p.soTaiKhoan.trim()) &&
        Boolean(p.tenChuTaiKhoan.trim()),
    ),
    taoLuc: row.tao_luc,
    capNhatLuc: row.cap_nhat_luc,
  };
}

async function loadPttt(cuaHangId: string): Promise<ShopPhuongThucTt[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_phuong_thuc_tt")
    .select(PTTT_SELECT)
    .eq("id_cua_hang", cuaHangId)
    .order("mac_dinh", { ascending: false })
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });
  if (error) {
    console.error("[shop] loadPttt", error);
    throw new Error("LOAD_FAILED");
  }
  return ((data ?? []) as PtttRow[]).map(mapPttt);
}

async function fetchCuaHangRow(
  userId: string,
): Promise<CuaHangRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_cua_hang")
    .select(CUA_HANG_SELECT)
    .eq("id_nguoi_dung", userId)
    .eq("da_xoa", false)
    .maybeSingle<CuaHangRow>();
  if (error) {
    console.error("[shop] fetchCuaHangRow", error);
    throw new Error("LOAD_FAILED");
  }
  return data ?? null;
}

export async function getShopCuaHangByUserId(
  userId: string,
): Promise<ShopCuaHang | null> {
  const row = await fetchCuaHangRow(userId);
  if (!row) return null;
  const pttt = await loadPttt(row.id);
  return mapCuaHang(row, pttt);
}

/** Chủ shop: tạo hàng trống nếu chưa có; khôi phục soft-delete nếu còn row. */
export async function getOrCreateShopCuaHang(
  userId: string,
): Promise<ShopCuaHang> {
  const existing = await getShopCuaHangByUserId(userId);
  if (existing) return existing;

  const admin = createServiceRoleClient();
  const { data: deleted, error: delErr } = await admin
    .from("shop_cua_hang")
    .select(CUA_HANG_SELECT)
    .eq("id_nguoi_dung", userId)
    .eq("da_xoa", true)
    .maybeSingle<CuaHangRow>();
  if (delErr) {
    console.error("[shop] getOrCreateShopCuaHang find-deleted", delErr);
    throw new Error("LOAD_FAILED");
  }
  if (deleted) {
    const now = new Date().toISOString();
    const { error: restoreErr } = await admin
      .from("shop_cua_hang")
      .update({ da_xoa: false, cap_nhat_luc: now })
      .eq("id", deleted.id)
      .eq("id_nguoi_dung", userId);
    if (restoreErr) {
      console.error("[shop] getOrCreateShopCuaHang restore", restoreErr);
      throw new Error("CREATE_FAILED");
    }
    const restored = await getShopCuaHangByUserId(userId);
    if (restored) return restored;
    throw new Error("CREATE_FAILED");
  }

  const { data, error } = await admin
    .from("shop_cua_hang")
    .insert({ id_nguoi_dung: userId })
    .select(CUA_HANG_SELECT)
    .single<CuaHangRow>();
  if (error) {
    /* Race: unique violation → đọc lại. */
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "23505") {
      const again = await getShopCuaHangByUserId(userId);
      if (again) return again;
    }
    console.error("[shop] getOrCreateShopCuaHang", error);
    throw new Error("CREATE_FAILED");
  }
  return mapCuaHang(data, []);
}

export type ShopCuaHangPatch = {
  ten?: string | null;
  moTa?: string | null;
  avatarId?: string | null;
  coverId?: string | null;
  bannerSuKienId?: string | null;
  bannerSuKienHien?: boolean;
  chinhSach?: string | null;
  lienHe?: string | null;
  nhanPhanLoai?: string | null;
  nhanPhanLoai2?: string | null;
  tamDong?: boolean;
  tamDongTu?: string | null;
  tamDongDen?: string | null;
  tamDongLyDo?: string | null;
};

export async function updateShopCuaHang(
  userId: string,
  patch: ShopCuaHangPatch,
): Promise<ShopCuaHang> {
  const shop = await getOrCreateShopCuaHang(userId);
  const admin = createServiceRoleClient();
  const row: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (patch.ten !== undefined) {
    const t = patch.ten?.trim() || null;
    row.ten = t && t.length > 120 ? t.slice(0, 120) : t;
  }
  if (patch.moTa !== undefined) {
    const t = patch.moTa?.trim() || null;
    row.mo_ta = t && t.length > 2000 ? t.slice(0, 2000) : t;
  }
  if (patch.avatarId !== undefined) {
    row.avatar_id = patch.avatarId?.trim() || null;
  }
  if (patch.coverId !== undefined) {
    row.cover_id = patch.coverId?.trim() || null;
  }
  if (patch.bannerSuKienId !== undefined) {
    row.banner_su_kien_id = patch.bannerSuKienId?.trim() || null;
  }
  if (patch.bannerSuKienHien !== undefined) {
    row.banner_su_kien_hien = patch.bannerSuKienHien === true;
  }
  if (patch.chinhSach !== undefined) {
    const t = patch.chinhSach?.trim() || null;
    row.chinh_sach = t && t.length > 4000 ? t.slice(0, 4000) : t;
  }
  if (patch.lienHe !== undefined) {
    const t = patch.lienHe?.trim() || null;
    row.lien_he = t && t.length > 500 ? t.slice(0, 500) : t;
  }
  if (patch.nhanPhanLoai !== undefined) {
    const t = patch.nhanPhanLoai?.trim() || null;
    row.nhan_phan_loai = t && t.length > 40 ? t.slice(0, 40) : t;
  }
  if (patch.nhanPhanLoai2 !== undefined) {
    const t = patch.nhanPhanLoai2?.trim() || null;
    row.nhan_phan_loai_2 = t && t.length > 40 ? t.slice(0, 40) : t;
  }
  if (patch.tamDong !== undefined) {
    row.tam_dong = patch.tamDong === true;
  }
  if (patch.tamDongTu !== undefined) {
    row.tam_dong_tu = patch.tamDongTu?.trim() || null;
  }
  if (patch.tamDongDen !== undefined) {
    row.tam_dong_den = patch.tamDongDen?.trim() || null;
  }
  if (patch.tamDongLyDo !== undefined) {
    row.tam_dong_ly_do = normalizeShopTamDongLyDo(patch.tamDongLyDo);
  }

  const nextTamDong =
    patch.tamDong !== undefined ? patch.tamDong === true : shop.tamDong;
  const nextTu =
    patch.tamDongTu !== undefined
      ? patch.tamDongTu?.trim() || null
      : shop.tamDongTu;
  const nextDen =
    patch.tamDongDen !== undefined
      ? patch.tamDongDen?.trim() || null
      : shop.tamDongDen;
  if (nextTamDong) {
    if (!nextTu) throw new Error("TAM_DONG_RANGE_REQUIRED");
    const tuMs = Date.parse(nextTu);
    if (!Number.isFinite(tuMs)) throw new Error("TAM_DONG_RANGE_INVALID");
    if (nextDen) {
      const denMs = Date.parse(nextDen);
      if (!Number.isFinite(denMs) || denMs <= tuMs) {
        throw new Error("TAM_DONG_RANGE_INVALID");
      }
    }
  } else if (patch.tamDong === false) {
    /* Tắt nghỉ → xoá lịch + lý do. */
    row.tam_dong_tu = null;
    row.tam_dong_den = null;
    row.tam_dong_ly_do = null;
  }

  const { error } = await admin
    .from("shop_cua_hang")
    .update(row)
    .eq("id", shop.id)
    .eq("id_nguoi_dung", userId);
  if (error) {
    console.error("[shop] updateShopCuaHang", error);
    throw new Error("UPDATE_FAILED");
  }
  const next = await getShopCuaHangByUserId(userId);
  if (!next) throw new Error("UPDATE_FAILED");
  return next;
}

export type ShopPtttInput = {
  id?: string;
  nganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  qrAnhId?: string | null;
  macDinh?: boolean;
  kichHoat?: boolean;
};

export async function upsertShopPhuongThucTt(
  userId: string,
  input: ShopPtttInput,
): Promise<ShopCuaHang> {
  const nganHang = input.nganHang.trim();
  const soTaiKhoan = input.soTaiKhoan.trim().replace(/\s+/g, "");
  const tenChu = input.tenChuTaiKhoan.trim();
  if (!nganHang || !soTaiKhoan || !tenChu) {
    throw new Error("PTTT_INVALID");
  }
  if (nganHang.length > 80 || soTaiKhoan.length > 40 || tenChu.length > 120) {
    throw new Error("PTTT_INVALID");
  }

  const shop = await getOrCreateShopCuaHang(userId);
  const admin = createServiceRoleClient();
  const macDinh = input.macDinh !== false;
  const kichHoat = input.kichHoat !== false;

  if (macDinh) {
    await admin
      .from("shop_phuong_thuc_tt")
      .update({ mac_dinh: false, cap_nhat_luc: new Date().toISOString() })
      .eq("id_cua_hang", shop.id);
  }

  const payload = {
    ngan_hang: nganHang,
    so_tai_khoan: soTaiKhoan,
    ten_chu_tai_khoan: tenChu,
    qr_anh_id: input.qrAnhId?.trim() || null,
    mac_dinh: macDinh,
    kich_hoat: kichHoat,
    cap_nhat_luc: new Date().toISOString(),
  };

  if (input.id?.trim()) {
    const { data, error } = await admin
      .from("shop_phuong_thuc_tt")
      .update(payload)
      .eq("id", input.id.trim())
      .eq("id_cua_hang", shop.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("[shop] updatePttt", error);
      throw new Error("UPDATE_FAILED");
    }
  } else {
    if (shop.phuongThucTt.length > 0) {
      throw new Error("PTTT_LIMIT");
    }
    const { error } = await admin.from("shop_phuong_thuc_tt").insert({
      id_cua_hang: shop.id,
      ...payload,
      thu_tu: 0,
    });
    if (error) {
      console.error("[shop] insertPttt", error);
      throw new Error("CREATE_FAILED");
    }
  }

  const next = await getShopCuaHangByUserId(userId);
  if (!next) throw new Error("UPDATE_FAILED");
  return next;
}

/**
 * Soft-delete cửa hàng của chủ sở hữu:
 * - `shop_cua_hang.da_xoa = true` (giữ row + STK)
 * - soft-delete catalog + bảng giá + nhóm
 * - tắt `ban_hang_bat` / ẩn shop công khai
 * Đơn hàng lịch sử giữ nguyên.
 */
export async function deleteShopCuaHang(userId: string): Promise<void> {
  const shop = await getShopCuaHangByUserId(userId);
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { error: spErr } = await admin
    .from("shop_san_pham")
    .update({ da_xoa: true, cap_nhat_luc: now })
    .eq("id_nguoi_dung", userId)
    .eq("da_xoa", false);
  if (spErr) {
    console.error("[shop] deleteShopCuaHang san_pham", spErr);
    throw new Error("DELETE_FAILED");
  }

  const { error: bgErr } = await admin
    .from("shop_bang_gia")
    .update({ da_xoa: true, cap_nhat_luc: now })
    .eq("id_nguoi_dung", userId)
    .eq("da_xoa", false);
  if (bgErr) {
    console.error("[shop] deleteShopCuaHang bang_gia", bgErr);
    throw new Error("DELETE_FAILED");
  }

  const { error: nhomErr } = await admin
    .from("shop_nhom")
    .update({ da_xoa: true, cap_nhat_luc: now })
    .eq("id_nguoi_dung", userId)
    .eq("da_xoa", false);
  if (nhomErr) {
    console.error("[shop] deleteShopCuaHang nhom", nhomErr);
    throw new Error("DELETE_FAILED");
  }

  if (shop) {
    const { error } = await admin
      .from("shop_cua_hang")
      .update({
        da_xoa: true,
        tam_dong: false,
        tam_dong_tu: null,
        tam_dong_den: null,
        tam_dong_ly_do: null,
        cap_nhat_luc: now,
      })
      .eq("id", shop.id)
      .eq("id_nguoi_dung", userId)
      .eq("da_xoa", false);
    if (error) {
      console.error("[shop] deleteShopCuaHang cua_hang", error);
      throw new Error("DELETE_FAILED");
    }
  }

  await setBanHangEnabled(userId, false, false);
}

export async function deleteShopPhuongThucTt(
  userId: string,
  ptttId: string,
): Promise<ShopCuaHang> {
  const shop = await getOrCreateShopCuaHang(userId);
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("shop_phuong_thuc_tt")
    .delete()
    .eq("id", ptttId)
    .eq("id_cua_hang", shop.id);
  if (error) {
    console.error("[shop] deletePttt", error);
    throw new Error("DELETE_FAILED");
  }
  /* Nếu xóa mặc định → gán cái còn lại làm mặc định. */
  const next = await getShopCuaHangByUserId(userId);
  if (!next) throw new Error("DELETE_FAILED");
  if (next.phuongThucTt.length > 0 && !next.phuongThucTt.some((p) => p.macDinh)) {
    await admin
      .from("shop_phuong_thuc_tt")
      .update({ mac_dinh: true, cap_nhat_luc: new Date().toISOString() })
      .eq("id", next.phuongThucTt[0]!.id);
    return (await getShopCuaHangByUserId(userId)) ?? next;
  }
  return next;
}

export function pickDefaultPttt(
  shop: ShopCuaHang | null,
): ShopPhuongThucTt | null {
  if (!shop) return null;
  const active = shop.phuongThucTt.filter((p) => p.kichHoat);
  if (active.length === 0) return null;
  return active.find((p) => p.macDinh) ?? active[0] ?? null;
}

export function buildThanhToanSnapshot(
  pttt: ShopPhuongThucTt,
  maDon: string,
  tongTien: number,
  tienTe: string,
): ShopThanhToanSnapshot {
  return {
    idPhuongThuc: pttt.id,
    nganHang: pttt.nganHang,
    soTaiKhoan: pttt.soTaiKhoan,
    tenChuTaiKhoan: pttt.tenChuTaiKhoan,
    qrAnhId: null,
    qrAnhUrl: null,
    noiDungCk: maDon,
    tongTien,
    tienTe,
  };
}

/** Public / checkout: chỉ khi seller đang bật bán hàng. */
export async function getShopCheckoutPayment(
  sellerUserId: string,
): Promise<{
  shop: ShopCuaHang | null;
  payment: ShopPhuongThucTt | null;
  banHangBat: boolean;
}> {
  const banHangBat = await getBanHangEnabled(sellerUserId);
  if (!banHangBat) {
    return { shop: null, payment: null, banHangBat: false };
  }
  const shop = await getShopCuaHangByUserId(sellerUserId);
  return {
    shop,
    payment: pickDefaultPttt(shop),
    banHangBat: true,
  };
}

export type ShopReadyMissing = "payment" | null;

export type ShopReadyStatus = {
  banHangBat: boolean;
  /** Bật bán + có ≥1 STK đang bật. */
  shopReady: boolean;
  missing: ShopReadyMissing;
};

function ptttHopLe(p: ShopPhuongThucTt): boolean {
  return (
    p.kichHoat &&
    Boolean(p.nganHang.trim()) &&
    Boolean(p.soTaiKhoan.trim()) &&
    Boolean(p.tenChuTaiKhoan.trim())
  );
}

export async function getShopReady(userId: string): Promise<ShopReadyStatus> {
  const banHangBat = await getBanHangEnabled(userId);
  if (!banHangBat) {
    return { banHangBat: false, shopReady: false, missing: null };
  }
  const shop = await getShopCuaHangByUserId(userId);
  const hasPayment = Boolean(shop?.phuongThucTt.some(ptttHopLe));
  if (!hasPayment) {
    return { banHangBat: true, shopReady: false, missing: "payment" };
  }
  return { banHangBat: true, shopReady: true, missing: null };
}

export async function assertShopReady(userId: string): Promise<void> {
  const status = await getShopReady(userId);
  if (!status.banHangBat) {
    throw new Error("BAN_HANG_OFF");
  }
  if (!status.shopReady) {
    throw new Error("SHOP_NOT_READY");
  }
}

/** Chặn mua / thêm giỏ khi shop đang trong cửa sổ tạm đóng. */
export async function assertShopNotTamDong(
  sellerUserId: string,
): Promise<void> {
  const shop = await getShopCuaHangByUserId(sellerUserId);
  if (isShopTamDongActive(shop)) {
    throw new Error("SHOP_TAM_DONG");
  }
}

export async function assertShopNotTamDongByCuaHangId(
  cuaHangId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_cua_hang")
    .select("tam_dong, tam_dong_tu, tam_dong_den")
    .eq("id", cuaHangId)
    .eq("da_xoa", false)
    .maybeSingle<{
      tam_dong: boolean | null;
      tam_dong_tu: string | null;
      tam_dong_den: string | null;
    }>();
  if (
    isShopTamDongActive({
      tamDong: data?.tam_dong === true,
      tamDongTu: data?.tam_dong_tu ?? null,
      tamDongDen: data?.tam_dong_den ?? null,
    })
  ) {
    throw new Error("SHOP_TAM_DONG");
  }
}

export {
  shopEntryHref,
  shopPublicHref,
  shopSetupHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";

/** Resolve slug cửa hàng + href canonical từ slug hồ sơ chủ. */
export async function resolveShopSlugForOwnerSlug(
  ownerSlug: string,
): Promise<{ shopSlug: string; href: string; ten: string | null } | null> {
  const slug = ownerSlug.trim();
  if (!slug) return null;
  const admin = createServiceRoleClient();
  const { data: owner, error: ownerErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string }>();
  if (ownerErr || !owner) return null;
  const { data: shop } = await admin
    .from("shop_cua_hang")
    .select("ten")
    .eq("id_nguoi_dung", owner.id)
    .eq("da_xoa", false)
    .maybeSingle<{ ten: string | null }>();
  const shopSlug = buildShopSlugFromTen(shop?.ten, owner.slug);
  return {
    shopSlug,
    href: buildShopPublicHref(owner.slug, shopSlug),
    ten: shop?.ten ?? null,
  };
}

export const SHOP_NOT_READY_MESSAGE =
  "Cần thêm tài khoản nhận tiền trong Shop trước khi thêm hàng hoặc nhận đơn.";

export const SHOP_TAM_DONG_MESSAGE =
  "Shop đang tạm đóng cửa — chưa nhận đơn.";
