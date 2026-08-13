import "server-only";

import {
  SHOP_DANG_KY_MO_TRANG_THAI,
  type ShopDangKyMoHinhThuc,
  type ShopDangKyMoKenh,
  type ShopDangKyMoTrangThai,
} from "@/lib/shop/dang-ky-mo-constants";
import type { ShopDangKyMoAdminItem, ShopDangKyMoHangGioiThieu } from "@/lib/shop/dang-ky-mo-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { ShopDangKyMoAdminItem } from "@/lib/shop/dang-ky-mo-types";

type Row = {
  id: string;
  ten_shop: string;
  mo_ta: string | null;
  ten_lien_he: string | null;
  loai_hang: string[] | null;
  hinh_thuc_ban: ShopDangKyMoHinhThuc | null;
  nen_tang_mxh: string[] | null;
  hang_gioi_thieu: {
    ten_mat_hang?: string;
    mo_ta?: string;
    gia_ban?: string;
    link?: string;
  }[] | null;
  resource_links: string[] | null;
  ghi_chu: string | null;
  kenh_lien_he: ShopDangKyMoKenh;
  lien_he_gia_tri: string;
  email: string | null;
  ngan_hang: string | null;
  so_tai_khoan: string | null;
  ten_chu_tk: string | null;
  da_co_tai_khoan: boolean;
  link_profile_cins: string | null;
  nguoi_gioi_thieu: string | null;
  trang_thai: ShopDangKyMoTrangThai;
  ghi_chu_noi_bo: string | null;
  id_nguoi_dung: string | null;
  id_cua_hang: string | null;
  nguon: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
};

const SELECT_COLS =
  "id, ten_shop, mo_ta, ten_lien_he, loai_hang, hinh_thuc_ban, nen_tang_mxh, hang_gioi_thieu, resource_links, ghi_chu, kenh_lien_he, lien_he_gia_tri, email, ngan_hang, so_tai_khoan, ten_chu_tk, da_co_tai_khoan, link_profile_cins, nguoi_gioi_thieu, trang_thai, ghi_chu_noi_bo, id_nguoi_dung, id_cua_hang, nguon, tao_luc, cap_nhat_luc";

function mapHangGioiThieu(
  raw: {
    ten_mat_hang?: string;
    mo_ta?: string;
    gia_ban?: string;
    link?: string;
  }[] | null,
): ShopDangKyMoHangGioiThieu[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      tenMatHang: (item.ten_mat_hang ?? "").trim(),
      moTa: (item.mo_ta ?? "").trim(),
      giaBan: (item.gia_ban ?? "").trim(),
      link: (item.link ?? "").trim(),
    }))
    .filter((item) => item.link.length > 0);
}

function mapRow(r: Row): ShopDangKyMoAdminItem {
  return {
    id: r.id,
    tenShop: r.ten_shop,
    moTa: r.mo_ta,
    tenLienHe: r.ten_lien_he,
    loaiHang: r.loai_hang ?? [],
    hinhThucBan: r.hinh_thuc_ban,
    mxhBanHangLinks: r.nen_tang_mxh ?? [],
    hangGioiThieu: mapHangGioiThieu(r.hang_gioi_thieu),
    resourceLinks: r.resource_links ?? [],
    ghiChu: r.ghi_chu,
    kenhLienHe: r.kenh_lien_he,
    lienHeGiaTri: r.lien_he_gia_tri,
    email: r.email,
    nganHang: r.ngan_hang,
    soTaiKhoan: r.so_tai_khoan,
    tenChuTk: r.ten_chu_tk,
    daCoTaiKhoan: Boolean(r.da_co_tai_khoan),
    linkProfileCins: r.link_profile_cins,
    nguoiGioiThieu: r.nguoi_gioi_thieu,
    trangThai: r.trang_thai,
    ghiChuNoiBo: r.ghi_chu_noi_bo,
    idNguoiDung: r.id_nguoi_dung,
    idCuaHang: r.id_cua_hang,
    nguon: r.nguon,
    taoLuc: r.tao_luc,
    capNhatLuc: r.cap_nhat_luc,
  };
}

function isTrangThai(v: string): v is ShopDangKyMoTrangThai {
  return (SHOP_DANG_KY_MO_TRANG_THAI as readonly string[]).includes(v);
}

/** Danh sách lead mở shop — mới nhất trước. */
export async function listShopDangKyMoForAdmin(): Promise<
  ShopDangKyMoAdminItem[]
> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_dang_ky_mo")
    .select(SELECT_COLS)
    .order("tao_luc", { ascending: false })
    .returns<Row[]>();

  if (error) {
    console.error("[shop] listShopDangKyMoForAdmin", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getShopDangKyMoById(
  id: string,
): Promise<ShopDangKyMoAdminItem | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_dang_ky_mo")
    .select(SELECT_COLS)
    .eq("id", trimmed)
    .maybeSingle<Row>();

  if (error) {
    console.error("[shop] getShopDangKyMoById", error.message);
    return null;
  }
  return data ? mapRow(data) : null;
}

export async function updateShopDangKyMoAdmin(input: {
  id: string;
  trangThai: string;
  ghiChuNoiBo?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = input.id.trim();
  if (!id) return { ok: false, error: "Thiếu id lead." };
  if (!isTrangThai(input.trangThai)) {
    return { ok: false, error: "Trạng thái không hợp lệ." };
  }

  const ghiChu =
    typeof input.ghiChuNoiBo === "string"
      ? input.ghiChuNoiBo.trim().slice(0, 4000) || null
      : input.ghiChuNoiBo === null
        ? null
        : undefined;

  const patch: Record<string, unknown> = {
    trang_thai: input.trangThai,
    cap_nhat_luc: new Date().toISOString(),
  };
  if (ghiChu !== undefined) {
    patch.ghi_chu_noi_bo = ghiChu;
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("shop_dang_ky_mo")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error("[shop] updateShopDangKyMoAdmin", error.message);
    return { ok: false, error: "Không cập nhật được lead." };
  }
  return { ok: true };
}

/** Gỡ lead khỏi hàng đợi — không xóa `shop_cua_hang`. Slot concierge được trả. */
export async function deleteShopDangKyMoAdmin(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false, error: "Thiếu id lead." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_dang_ky_mo")
    .delete()
    .eq("id", trimmed)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("[shop] deleteShopDangKyMoAdmin", error.message);
    return { ok: false, error: "Không gỡ được lead." };
  }
  if (!data) return { ok: false, error: "Lead không còn trong danh sách." };
  return { ok: true };
}
