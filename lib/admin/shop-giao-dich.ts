import "server-only";

import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import {
  SHOP_LOAI_DON_LABEL,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopLoaiDon,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AdminGiaoDichTab = "don" | "shop";

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

/** Listing cửa hàng + doanh thu giao dịch (admin). */
export type AdminShopListingRow = {
  id: string;
  ten: string | null;
  tamDong: boolean;
  taoLuc: string;
  owner: { id: string; ten: string | null; slug: string | null };
  shopHref: string | null;
  soDon: number;
  soDonHoanTat: number;
  /** Tổng `tong_tien` đơn đã nhận tiền / đã giao tại sự kiện. */
  doanhThu: number;
  /** Tổng `tong_tien` mọi đơn không nháp/hủy. */
  tongGiaoDich: number;
  tienTe: string;
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
  page?: number;
}): Promise<{ items: AdminShopDonRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const admin = createServiceRoleClient();

  const q = admin
    .from("shop_don_hang")
    .select(
      "id, id_nguoi_mua, id_nguoi_ban, loai_don, trang_thai, tien_te, tong_tien, ghi_chu, tao_luc, xac_nhan_luc, nguoi_mua_chap_nhan_luc, nguoi_mua_chap_nhan_van_ban, nguoi_mua_chap_nhan_phien_ban",
      { count: "exact" },
    )
    .order("tao_luc", { ascending: false })
    .range(from, to);

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

const REVENUE_STATUSES = new Set<ShopTrangThaiDon>([
  "da_nhan_tien",
  "da_giao_tai_su_kien",
]);

type ShopAgg = {
  soDon: number;
  soDonHoanTat: number;
  doanhThu: number;
  tongGiaoDich: number;
  tienTe: string;
};

function emptyAgg(): ShopAgg {
  return {
    soDon: 0,
    soDonHoanTat: 0,
    doanhThu: 0,
    tongGiaoDich: 0,
    tienTe: "VND",
  };
}

async function buildSellerOrderAgg(): Promise<Map<string, ShopAgg>> {
  const admin = createServiceRoleClient();
  const map = new Map<string, ShopAgg>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .from("shop_don_hang")
      .select("id_nguoi_ban, trang_thai, tong_tien, tien_te")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<
        Array<{
          id_nguoi_ban: string;
          trang_thai: ShopTrangThaiDon;
          tong_tien: number | string;
          tien_te: string | null;
        }>
      >();

    if (error) {
      console.error("[admin] buildSellerOrderAgg", error);
      break;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const sellerId = row.id_nguoi_ban;
      if (!sellerId) continue;
      const agg = map.get(sellerId) ?? emptyAgg();
      const amount = Number(row.tong_tien) || 0;
      if (row.tien_te?.trim()) agg.tienTe = row.tien_te.trim();

      if (row.trang_thai !== "nhap") {
        agg.soDon += 1;
      }
      if (row.trang_thai !== "nhap" && row.trang_thai !== "huy") {
        agg.tongGiaoDich += amount;
      }
      if (REVENUE_STATUSES.has(row.trang_thai)) {
        agg.soDonHoanTat += 1;
        agg.doanhThu += amount;
      }
      map.set(sellerId, agg);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 100_000) break;
  }

  return map;
}

/**
 * Shop “đủ điều kiện” admin:
 * 1. `ban_hang_bat`
 * 2. ≥1 STK chuyển khoản đang bật (ngân hàng + số TK + tên chủ)
 * 3. ≥1 `shop_san_pham` đang bán (`dang_ban`, chưa xóa)
 */
export async function listAdminShopListings(opts?: {
  page?: number;
}): Promise<{
  items: AdminShopListingRow[];
  total: number;
  page: number;
  pageSize: number;
  tongDoanhThu: number;
  tongGiaoDich: number;
}> {
  const page = Math.max(1, opts?.page ?? 1);
  const admin = createServiceRoleClient();

  const [{ data: shops, error: shopErr }, orderAgg] = await Promise.all([
    admin
      .from("shop_cua_hang")
      .select("id, id_nguoi_dung, ten, tam_dong, da_xoa, tao_luc")
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(2000)
      .returns<
        Array<{
          id: string;
          id_nguoi_dung: string;
          ten: string | null;
          tam_dong: boolean | null;
          da_xoa: boolean | null;
          tao_luc: string;
        }>
      >(),
    buildSellerOrderAgg(),
  ]);

  if (shopErr) {
    console.error("[admin] listAdminShopListings", shopErr);
    throw new Error("LIST_FAILED");
  }

  const shopRows = shops ?? [];
  if (shopRows.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize: PAGE_SIZE,
      tongDoanhThu: 0,
      tongGiaoDich: 0,
    };
  }

  const ownerIds = [...new Set(shopRows.map((s) => s.id_nguoi_dung))];
  const shopIds = shopRows.map((s) => s.id);

  const [{ data: users }, { data: ptttRows }, { data: productRows }] =
    await Promise.all([
      admin
        .from("user_nguoi_dung")
        .select("id, ten_hien_thi, slug, ban_hang_bat")
        .in("id", ownerIds)
        .returns<
          Array<{
            id: string;
            ten_hien_thi: string | null;
            slug: string | null;
            ban_hang_bat: boolean | null;
          }>
        >(),
      admin
        .from("shop_phuong_thuc_tt")
        .select(
          "id_cua_hang, ngan_hang, so_tai_khoan, ten_chu_tai_khoan, kich_hoat",
        )
        .in("id_cua_hang", shopIds)
        .returns<
          Array<{
            id_cua_hang: string;
            ngan_hang: string | null;
            so_tai_khoan: string | null;
            ten_chu_tai_khoan: string | null;
            kich_hoat: boolean | null;
          }>
        >(),
      admin
        .from("shop_san_pham")
        .select("id_nguoi_dung")
        .in("id_nguoi_dung", ownerIds)
        .eq("dang_ban", true)
        .eq("da_xoa", false)
        .returns<Array<{ id_nguoi_dung: string }>>(),
    ]);

  const userMap = new Map(
    (users ?? []).map((u) => [
      u.id,
      {
        id: u.id,
        ten: u.ten_hien_thi,
        slug: u.slug,
        banHangBat: u.ban_hang_bat === true,
      },
    ]),
  );

  const shopCoThanhToan = new Set<string>();
  for (const p of ptttRows ?? []) {
    if (
      p.kich_hoat === true &&
      Boolean(p.ngan_hang?.trim()) &&
      Boolean(p.so_tai_khoan?.trim()) &&
      Boolean(p.ten_chu_tai_khoan?.trim())
    ) {
      shopCoThanhToan.add(p.id_cua_hang);
    }
  }

  const sellerCoHang = new Set<string>();
  for (const p of productRows ?? []) {
    if (p.id_nguoi_dung) sellerCoHang.add(p.id_nguoi_dung);
  }

  let tongDoanhThu = 0;
  let tongGiaoDichAll = 0;
  const allItems: AdminShopListingRow[] = [];

  for (const s of shopRows) {
    const owner = userMap.get(s.id_nguoi_dung);
    if (!owner?.banHangBat) continue;
    if (!shopCoThanhToan.has(s.id)) continue;
    if (!sellerCoHang.has(s.id_nguoi_dung)) continue;

    const agg = orderAgg.get(s.id_nguoi_dung) ?? emptyAgg();
    tongDoanhThu += agg.doanhThu;
    tongGiaoDichAll += agg.tongGiaoDich;

    const shopHref =
      owner.slug != null
        ? shopPublicHref(owner.slug, shopSlugFromTen(s.ten, owner.slug))
        : null;

    allItems.push({
      id: s.id,
      ten: s.ten?.trim() || null,
      tamDong: s.tam_dong === true,
      taoLuc: s.tao_luc,
      owner: { id: owner.id, ten: owner.ten, slug: owner.slug },
      shopHref,
      soDon: agg.soDon,
      soDonHoanTat: agg.soDonHoanTat,
      doanhThu: agg.doanhThu,
      tongGiaoDich: agg.tongGiaoDich,
      tienTe: agg.tienTe,
    });
  }

  allItems.sort((a, b) => {
    if (b.doanhThu !== a.doanhThu) return b.doanhThu - a.doanhThu;
    if (b.tongGiaoDich !== a.tongGiaoDich) return b.tongGiaoDich - a.tongGiaoDich;
    return b.soDon - a.soDon;
  });

  const total = allItems.length;
  const from = (page - 1) * PAGE_SIZE;
  const items = allItems.slice(from, from + PAGE_SIZE);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    tongDoanhThu,
    tongGiaoDich: tongGiaoDichAll,
  };
}
