import "server-only";

import {
  SHOP_LOAI_DON_LABEL,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopLoaiDon,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AdminGiaoDichTab = "don" | "chap-nhan";

export type AdminShopDonDong = {
  tenSnapshot: string;
  nhanSnapshot: string | null;
  soLuong: number;
  giaDonVi: number;
};

export type AdminShopDonRow = {
  id: string;
  loaiDon: ShopLoaiDon;
  loaiDonLabel: string;
  trangThai: ShopTrangThaiDon;
  trangThaiLabel: string;
  tienTe: string;
  tongTien: number;
  ghiChu: string | null;
  hoaDonAnhUrl: string | null;
  taoLuc: string;
  xacNhanLuc: string | null;
  nguoiMuaChapNhanLuc: string | null;
  nguoiMuaChapNhanVanBan: string | null;
  nguoiMuaChapNhanPhienBan: string | null;
  mua: { id: string; ten: string | null; slug: string | null };
  ban: { id: string; ten: string | null; slug: string | null };
  dong: AdminShopDonDong[];
};

type DonDb = {
  id: string;
  id_nguoi_mua: string;
  id_nguoi_ban: string;
  loai_don: ShopLoaiDon;
  trang_thai: ShopTrangThaiDon;
  tien_te: string;
  tong_tien: number | string;
  ghi_chu: string | null;
  tao_luc: string;
  xac_nhan_luc: string | null;
  nguoi_mua_chap_nhan_luc: string | null;
  nguoi_mua_chap_nhan_van_ban: string | null;
  nguoi_mua_chap_nhan_phien_ban: string | null;
};

type DongDb = {
  id_don_hang: string;
  ten_snapshot: string;
  nhan_snapshot: string | null;
  so_luong: number;
  gia_don_vi: number | string;
};

const PAGE_SIZE = 40;

export function extractHoaDonAnhUrl(ghiChu: string | null): string | null {
  if (!ghiChu) return null;
  const m = ghiChu.match(/Hóa đơn thanh toán:\s*(\S+)/);
  return m?.[1] ?? null;
}

export async function listAdminShopDonHang(opts: {
  tab: AdminGiaoDichTab;
  page?: number;
}): Promise<{ items: AdminShopDonRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const admin = createServiceRoleClient();

  let q = admin
    .from("shop_don_hang")
    .select(
      "id, id_nguoi_mua, id_nguoi_ban, loai_don, trang_thai, tien_te, tong_tien, ghi_chu, tao_luc, xac_nhan_luc, nguoi_mua_chap_nhan_luc, nguoi_mua_chap_nhan_van_ban, nguoi_mua_chap_nhan_phien_ban",
      { count: "exact" },
    )
    .order("tao_luc", { ascending: false })
    .range(from, to);

  if (opts.tab === "chap-nhan") {
    q = q.not("nguoi_mua_chap_nhan_luc", "is", null);
  }

  const { data, error, count } = await q;
  if (error) {
    console.error("[admin] listAdminShopDonHang", error);
    throw new Error("LIST_FAILED");
  }

  const rows = (data ?? []) as DonDb[];
  if (rows.length === 0) {
    return { items: [], total: count ?? 0, page, pageSize: PAGE_SIZE };
  }

  const donIds = rows.map((r) => r.id);
  const userIds = [...new Set(rows.flatMap((r) => [r.id_nguoi_mua, r.id_nguoi_ban]))];

  const [{ data: dongs }, { data: users }] = await Promise.all([
    admin
      .from("shop_don_hang_dong")
      .select("id_don_hang, ten_snapshot, nhan_snapshot, so_luong, gia_don_vi")
      .in("id_don_hang", donIds),
    admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi, slug")
      .in("id", userIds),
  ]);

  const dongByDon = new Map<string, AdminShopDonDong[]>();
  for (const d of (dongs ?? []) as DongDb[]) {
    const list = dongByDon.get(d.id_don_hang) ?? [];
    list.push({
      tenSnapshot: d.ten_snapshot,
      nhanSnapshot: d.nhan_snapshot,
      soLuong: d.so_luong,
      giaDonVi: Number(d.gia_don_vi),
    });
    dongByDon.set(d.id_don_hang, list);
  }

  const userMap = new Map(
    (
      (users ?? []) as Array<{
        id: string;
        ten_hien_thi: string | null;
        slug: string | null;
      }>
    ).map((u) => [u.id, { id: u.id, ten: u.ten_hien_thi, slug: u.slug }]),
  );

  const items: AdminShopDonRow[] = rows.map((r) => ({
    id: r.id,
    loaiDon: r.loai_don,
    loaiDonLabel: SHOP_LOAI_DON_LABEL[r.loai_don] ?? r.loai_don,
    trangThai: r.trang_thai,
    trangThaiLabel: SHOP_TRANG_THAI_DON_LABEL[r.trang_thai] ?? r.trang_thai,
    tienTe: r.tien_te,
    tongTien: Number(r.tong_tien),
    ghiChu: r.ghi_chu,
    hoaDonAnhUrl: extractHoaDonAnhUrl(r.ghi_chu),
    taoLuc: r.tao_luc,
    xacNhanLuc: r.xac_nhan_luc,
    nguoiMuaChapNhanLuc: r.nguoi_mua_chap_nhan_luc,
    nguoiMuaChapNhanVanBan: r.nguoi_mua_chap_nhan_van_ban,
    nguoiMuaChapNhanPhienBan: r.nguoi_mua_chap_nhan_phien_ban,
    mua: userMap.get(r.id_nguoi_mua) ?? {
      id: r.id_nguoi_mua,
      ten: null,
      slug: null,
    },
    ban: userMap.get(r.id_nguoi_ban) ?? {
      id: r.id_nguoi_ban,
      ten: null,
      slug: null,
    },
    dong: dongByDon.get(r.id) ?? [],
  }));

  return { items, total: count ?? items.length, page, pageSize: PAGE_SIZE };
}
