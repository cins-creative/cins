import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { shopImageUrl } from "@/lib/shop/settings";
import {
  getTiepCanTheoLoai,
  getTiepCanTheoSanPham,
  type ShopTiepCanLoai,
  type ShopTiepCanSanPham,
} from "@/lib/shop/tiep-can-loai";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type BaoCaoSanPhamBanChay = {
  ten: string;
  /** Nhãn biến thể (màu, size…) tại thời điểm đặt hàng */
  nhanSnapshot: string | null;
  /** Phân loại sản phẩm (từ shop_san_pham.phan_loai) */
  phanLoai: string | null;
  phanLoai2: string | null;
  /** URL thumbnail (biến thể hoặc sản phẩm) */
  anhUrl: string | null;
  soLuong: number;
  doanhThu: number;
};

export type BaoCaoNgay = {
  ngay: string; // "YYYY-MM-DD"
  doanhThu: number;
  soDon: number;
};

export type BaoCaoTrangThaiDon = {
  trangThai: string;
  nhan: string;
  count: number;
};

export type BaoCaoDoanhThu = {
  tongDoanhThu: number;
  thangNay: number;
  thangTruoc: number;
  tongDonHoanThanh: number;
  tongDonChoXacNhan: number;
  tongDonHuy: number;
  sanPhamBanChay: BaoCaoSanPhamBanChay[];
  doanhThuNgay: BaoCaoNgay[];
  trangThaiDon: BaoCaoTrangThaiDon[];
  tienTe: string;
  soDonCoPhien: number;
  soDonSauKhiXem: number;
  tiLeChuyenDoiGanPhienPct: number | null;
  loaiTiepCan: ShopTiepCanLoai[];
  sanPhamThayNhieu: ShopTiepCanSanPham[];
};

const TRANG_THAI_LABEL: Record<string, string> = {
  nhap: "Nháp",
  cho_xac_nhan: "Chờ xác nhận",
  da_nhan_tien: "Đã nhận tiền",
  da_giao_tai_su_kien: "Đã giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã hủy",
};

/* Doanh thu = đơn đã chốt (đã nhận tiền / đã giao / hoàn thành). */
const COMPLETED = new Set([
  "da_nhan_tien",
  "da_giao_tai_su_kien",
  "hoan_thanh",
]);

type DonBaoCaoRow = {
  id: string;
  trang_thai: string;
  tong_tien: number | string | null;
  tao_luc: string;
  tien_te: string | null;
  phien_id: string | null;
};

async function loadAllDons(sellerId: string): Promise<DonBaoCaoRow[] | null> {
  const admin = createServiceRoleClient();
  const out: DonBaoCaoRow[] = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("shop_don_hang")
      .select("id, trang_thai, tong_tien, tao_luc, tien_te, phien_id")
      .eq("id_nguoi_ban", sellerId)
      .neq("trang_thai", "nhap")
      .order("tao_luc", { ascending: false })
      .range(from, from + page - 1)
      .returns<DonBaoCaoRow[]>();
    if (error) {
      console.error("[shop] bao-cao dons", error);
      return null;
    }
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return out;
}

async function demDonSauKhiXem(phienHashes: string[]): Promise<Set<string>> {
  const seen = new Set<string>();
  const unique = [...new Set(phienHashes.filter(Boolean))];
  if (unique.length === 0) return seen;
  const admin = createServiceRoleClient();
  const chunk = 100;
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk);
    const { data, error } = await admin
      .from("social_luot_xem")
      .select("phien_id")
      .eq("loai_doi_tuong", "shop_san_pham")
      .in("phien_id", slice)
      .not("phien_id", "is", null)
      .limit(5000)
      .returns<Array<{ phien_id: string | null }>>();
    if (error) {
      console.error("[shop] bao-cao attribution", error);
      break;
    }
    for (const r of data ?? []) {
      if (r.phien_id) seen.add(r.phien_id);
    }
  }
  return seen;
}

function emptyBaoCao(): BaoCaoDoanhThu {
  return {
    tongDoanhThu: 0,
    thangNay: 0,
    thangTruoc: 0,
    tongDonHoanThanh: 0,
    tongDonChoXacNhan: 0,
    tongDonHuy: 0,
    sanPhamBanChay: [],
    doanhThuNgay: [],
    trangThaiDon: [],
    tienTe: "VND",
    soDonCoPhien: 0,
    soDonSauKhiXem: 0,
    tiLeChuyenDoiGanPhienPct: null,
    loaiTiepCan: [],
    sanPhamThayNhieu: [],
  };
}

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const sellerId = session.profile.id;

  const dons = await loadAllDons(sellerId);
  if (!dons) {
    return NextResponse.json({ error: "Không tải được dữ liệu." }, { status: 500 });
  }

  const [loaiTiepCan, sanPhamThayNhieu] = await Promise.all([
    getTiepCanTheoLoai(sellerId),
    getTiepCanTheoSanPham(sellerId, 8),
  ]);

  if (dons.length === 0) {
    return NextResponse.json({
      ...emptyBaoCao(),
      loaiTiepCan: loaiTiepCan.slice(0, 8),
      sanPhamThayNhieu,
    });
  }

  const donIds = dons.map((d) => d.id);
  const tienTe = (dons.find((d) => d.tien_te)?.tien_te as string | undefined) ?? "VND";

  const dongRows: {
    id_don_hang: string;
    id_bien_the: string | null;
    ten_snapshot: string;
    nhan_snapshot: string | null;
    so_luong: number;
    gia_don_vi: number | string;
  }[] = [];
  const dongChunk = 200;
  for (let i = 0; i < donIds.length; i += dongChunk) {
    const slice = donIds.slice(i, i + dongChunk);
    const { data: dongs } = await admin
      .from("shop_don_hang_dong")
      .select("id_don_hang, id_bien_the, ten_snapshot, nhan_snapshot, so_luong, gia_don_vi")
      .in("id_don_hang", slice);
    dongRows.push(
      ...((dongs ?? []) as typeof dongRows),
    );
  }

  // 1. Tổng quan doanh thu
  const now = new Date();
  const startThangNay = new Date(now.getFullYear(), now.getMonth(), 1);
  const startThangTruoc = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endThangTruoc = startThangNay;

  let tongDoanhThu = 0;
  let thangNay = 0;
  let thangTruoc = 0;
  let tongDonHoanThanh = 0;
  let tongDonChoXacNhan = 0;
  let tongDonHuy = 0;

  for (const don of dons) {
    const trangThai = don.trang_thai as string;
    const taoLuc = new Date(don.tao_luc as string);
    const soTien = Number(don.tong_tien ?? 0);

    if (trangThai === "cho_xac_nhan") tongDonChoXacNhan++;
    if (trangThai === "huy") tongDonHuy++;

    if (!COMPLETED.has(trangThai)) continue;

    tongDonHoanThanh++;
    tongDoanhThu += soTien;
    if (taoLuc >= startThangNay) thangNay += soTien;
    if (taoLuc >= startThangTruoc && taoLuc < endThangTruoc) thangTruoc += soTien;
  }

  // 2. Top sản phẩm bán chạy — group by variant (id_bien_the) hoặc ten+nhan
  const completedDonIds = new Set(
    dons.filter((d) => COMPLETED.has(d.trang_thai as string)).map((d) => d.id),
  );

  type ProductEntry = {
    ten: string;
    nhanSnapshot: string | null;
    idBienThe: string | null;
    soLuong: number;
    doanhThu: number;
  };
  const productMap = new Map<string, ProductEntry>();

  for (const dong of dongRows) {
    if (!completedDonIds.has(dong.id_don_hang)) continue;
    // Group key: prefer variant id, fall back to name+label combo
    const key = dong.id_bien_the
      ? `bt:${dong.id_bien_the}`
      : `snap:${dong.ten_snapshot.trim()}|${dong.nhan_snapshot?.trim() ?? ""}`;
    const sl = Number(dong.so_luong ?? 0);
    const gia = Number(dong.gia_don_vi ?? 0);
    const existing = productMap.get(key);
    if (existing) {
      existing.soLuong += sl;
      existing.doanhThu += sl * gia;
    } else {
      productMap.set(key, {
        ten: dong.ten_snapshot.trim(),
        nhanSnapshot: dong.nhan_snapshot?.trim() || null,
        idBienThe: dong.id_bien_the,
        soLuong: sl,
        doanhThu: sl * gia,
      });
    }
  }

  // Sort by quantity sold, take top 8
  const topEntries = [...productMap.values()]
    .sort((a, b) => b.soLuong - a.soLuong)
    .slice(0, 8);

  // Fetch variant + product meta for thumbnails and loại
  const btIds = topEntries
    .map((e) => e.idBienThe)
    .filter((id): id is string => id !== null);

  type BtRow = { id: string; id_san_pham: string; anh_id: string | null };
  type SpRow = { id: string; anh_id: string | null; phan_loai: string | null; phan_loai_2: string | null };

  const btMeta = new Map<string, { anhUrl: string | null; phanLoai: string | null; phanLoai2: string | null }>();

  if (btIds.length > 0) {
    const { data: bts } = await admin
      .from("shop_bien_the")
      .select("id, id_san_pham, anh_id")
      .in("id", btIds);
    const btList = (bts ?? []) as BtRow[];
    const spIds = [...new Set(btList.map((b) => b.id_san_pham).filter(Boolean))];
    const spMeta = new Map<string, SpRow>();
    if (spIds.length > 0) {
      const { data: sps } = await admin
        .from("shop_san_pham")
        .select("id, anh_id, phan_loai, phan_loai_2")
        .in("id", spIds);
      for (const s of (sps ?? []) as SpRow[]) {
        spMeta.set(s.id, s);
      }
    }
    for (const bt of btList) {
      const sp = spMeta.get(bt.id_san_pham);
      btMeta.set(bt.id, {
        anhUrl: shopImageUrl(bt.anh_id ?? sp?.anh_id ?? null),
        phanLoai: sp?.phan_loai?.trim() || null,
        phanLoai2: sp?.phan_loai_2?.trim() || null,
      });
    }
  }

  const sanPhamBanChay: BaoCaoSanPhamBanChay[] = topEntries.map((e) => {
    const meta = e.idBienThe ? btMeta.get(e.idBienThe) : undefined;
    return {
      ten: e.ten,
      nhanSnapshot: e.nhanSnapshot,
      phanLoai: meta?.phanLoai ?? null,
      phanLoai2: meta?.phanLoai2 ?? null,
      anhUrl: meta?.anhUrl ?? null,
      soLuong: e.soLuong,
      doanhThu: e.doanhThu,
    };
  });

  // 3. Doanh thu theo ngày — 30 ngày gần nhất
  const dayMap = new Map<string, { doanhThu: number; soDon: number }>();
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 3_600_000);

  for (const don of dons) {
    if (!COMPLETED.has(don.trang_thai as string)) continue;
    const taoLuc = new Date(don.tao_luc as string);
    if (taoLuc < cutoff30) continue;
    const dateKey = taoLuc.toISOString().slice(0, 10);
    const existing = dayMap.get(dateKey) ?? { doanhThu: 0, soDon: 0 };
    existing.doanhThu += Number(don.tong_tien ?? 0);
    existing.soDon += 1;
    dayMap.set(dateKey, existing);
  }

  // Fill all 30 days (even empty ones)
  const doanhThuNgay: BaoCaoNgay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3_600_000);
    const dateKey = d.toISOString().slice(0, 10);
    const entry = dayMap.get(dateKey) ?? { doanhThu: 0, soDon: 0 };
    doanhThuNgay.push({ ngay: dateKey, ...entry });
  }

  // 4. Phân tích trạng thái đơn
  const statusCount = new Map<string, number>();
  for (const don of dons) {
    const ts = don.trang_thai as string;
    statusCount.set(ts, (statusCount.get(ts) ?? 0) + 1);
  }

  const trangThaiDon: BaoCaoTrangThaiDon[] = [...statusCount.entries()]
    .map(([trangThai, count]) => ({
      trangThai,
      nhan: TRANG_THAI_LABEL[trangThai] ?? trangThai,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const phienHashes = dons
    .map((d) => d.phien_id)
    .filter((h): h is string => Boolean(h));
  const soDonCoPhien = phienHashes.length;
  const xemSet = await demDonSauKhiXem(phienHashes);
  const soDonSauKhiXem = dons.filter(
    (d) => d.phien_id && xemSet.has(d.phien_id),
  ).length;
  const tiLeChuyenDoiGanPhienPct =
    soDonCoPhien > 0
      ? Math.round((soDonSauKhiXem / soDonCoPhien) * 1000) / 10
      : null;

  const result: BaoCaoDoanhThu = {
    tongDoanhThu,
    thangNay,
    thangTruoc,
    tongDonHoanThanh,
    tongDonChoXacNhan,
    tongDonHuy,
    sanPhamBanChay,
    doanhThuNgay,
    trangThaiDon,
    tienTe,
    soDonCoPhien,
    soDonSauKhiXem,
    tiLeChuyenDoiGanPhienPct,
    loaiTiepCan: loaiTiepCan.slice(0, 8),
    sanPhamThayNhieu,
  };

  return NextResponse.json(result);
}
