import "server-only";

import { tenNganHangTuCode } from "@/lib/cins/tai-chinh-banks";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Fallback khi DB trống / lỗi đọc. */
export const CSDT_PHI_TY_LE_DEFAULT = 0.1;
export const CSDT_PHI_NGUONG_VND_DEFAULT = 2_000_000;
export const CSDT_PHI_SO_NGAY_HAN_DEFAULT = 7;
export const SHOP_PHI_TY_LE_DEFAULT = 0.05;
export const SHOP_PHI_TOI_THIEU_XUAT_KY_DEFAULT = 50_000;
export const SHOP_PHI_NGUONG_KICH_HOAT_DEFAULT = 0;

export type CinsTaiChinhCsdt = {
  tyLe: number;
  nguongVnd: number;
  soNgayHanTra: number;
  nguongEgressGb: number | null;
};

export type CinsTaiChinhShopDongDon = {
  ngayKhaoSatSuKien: number;
  ngayKhaoSatTrucTiep: number;
  ngayKhaoSatOnline: number;
  ngayTuDongSuKien: number;
  ngayTuDongTrucTiep: number;
  ngayTuDongOnline: number;
  ngayTuDongOnlineKhongMa: number;
  soLanChoHoan: number;
  ngayHoanChuaNhan: number;
};

/** Soft-limit spam đơn buyer (P3b). `0` = tắt từng ngưỡng. */
export type CinsTaiChinhShopBuyerLimit = {
  toiDaDonChoXacNhan: number;
  toiDaDonChoXacNhanMoiShop: number;
  toiDaDonMoiNgay: number;
};

export type CinsTaiChinhShop = {
  tyLe: number;
  nguongVnd: number;
  toiThieuXuatKyVnd: number;
  soNgayHanTra: number;
  soNgayAnHanTuKhai: number;
  dongDon: CinsTaiChinhShopDongDon;
  buyerLimit: CinsTaiChinhShopBuyerLimit;
};

export const SHOP_DONG_DON_DEFAULTS: CinsTaiChinhShopDongDon = {
  ngayKhaoSatSuKien: 1,
  ngayKhaoSatTrucTiep: 3,
  ngayKhaoSatOnline: 7,
  ngayTuDongSuKien: 3,
  ngayTuDongTrucTiep: 7,
  ngayTuDongOnline: 14,
  ngayTuDongOnlineKhongMa: 21,
  soLanChoHoan: 2,
  ngayHoanChuaNhan: 7,
};

export const SHOP_BUYER_LIMIT_DEFAULTS: CinsTaiChinhShopBuyerLimit = {
  toiDaDonChoXacNhan: 10,
  toiDaDonChoXacNhanMoiShop: 3,
  toiDaDonMoiNgay: 20,
};

export type CinsTaiChinhBank = {
  ten: string | null;
  soTk: string | null;
  chuTk: string | null;
  bin: string | null;
};

export type CinsTaiChinhDoanhNghiep = {
  tenPhapNhan: string | null;
  mst: string | null;
  diaChi: string | null;
  nguoiDaiDien: string | null;
  emailHoaDon: string | null;
};

export type CinsTaiChinh = {
  id: string;
  csdt: CinsTaiChinhCsdt;
  shop: CinsTaiChinhShop;
  bank: CinsTaiChinhBank;
  doanhNghiep: CinsTaiChinhDoanhNghiep;
  xuatHoaDonBat: boolean;
  ghiChu: string | null;
  capNhatBoi: string | null;
  capNhatLuc: string;
  taoLuc: string;
};

/** STK đủ để hiện khối thanh toán / QR. */
export function hasStkNhanPhi(cfg: CinsTaiChinh): boolean {
  return Boolean(
    cfg.bank.soTk?.trim() &&
      (cfg.bank.bin?.trim() || cfg.bank.ten?.trim()) &&
      cfg.bank.chuTk?.trim(),
  );
}

type DbRow = {
  id: string;
  csdt_ty_le: number | string;
  csdt_nguong_kich_hoat_vnd: number | string;
  csdt_so_ngay_han_tra: number;
  csdt_nguong_egress_gb: number | null;
  shop_ty_le: number | string | null;
  shop_nguong_kich_hoat_vnd: number | string | null;
  shop_toi_thieu_xuat_ky_vnd: number | string | null;
  so_ngay_han_tra: number | null;
  so_ngay_an_han_tu_khai: number | null;
  shop_ngay_khao_sat_su_kien: number | null;
  shop_ngay_khao_sat_truc_tiep: number | null;
  shop_ngay_khao_sat_online: number | null;
  shop_ngay_tu_dong_su_kien: number | null;
  shop_ngay_tu_dong_truc_tiep: number | null;
  shop_ngay_tu_dong_online: number | null;
  shop_ngay_tu_dong_online_khong_ma: number | null;
  shop_so_lan_cho_hoan: number | null;
  shop_ngay_hoan_chua_nhan: number | null;
  buyer_toi_da_don_cho_xac_nhan: number | null;
  buyer_toi_da_don_cho_xac_nhan_moi_shop: number | null;
  buyer_toi_da_don_moi_ngay: number | null;
  bank_ten: string | null;
  bank_so_tk: string | null;
  bank_chu_tk: string | null;
  bank_bin: string | null;
  dn_ten_phap_nhan: string | null;
  dn_mst: string | null;
  dn_dia_chi: string | null;
  dn_nguoi_dai_dien: string | null;
  dn_email_hoa_don: string | null;
  xuat_hoa_don_bat: boolean;
  ghi_chu: string | null;
  cap_nhat_boi: string | null;
  cap_nhat_luc: string;
  tao_luc: string;
};

const SELECT_COLS =
  "id, csdt_ty_le, csdt_nguong_kich_hoat_vnd, csdt_so_ngay_han_tra, csdt_nguong_egress_gb, shop_ty_le, shop_nguong_kich_hoat_vnd, shop_toi_thieu_xuat_ky_vnd, so_ngay_han_tra, so_ngay_an_han_tu_khai, shop_ngay_khao_sat_su_kien, shop_ngay_khao_sat_truc_tiep, shop_ngay_khao_sat_online, shop_ngay_tu_dong_su_kien, shop_ngay_tu_dong_truc_tiep, shop_ngay_tu_dong_online, shop_ngay_tu_dong_online_khong_ma, shop_so_lan_cho_hoan, shop_ngay_hoan_chua_nhan, buyer_toi_da_don_cho_xac_nhan, buyer_toi_da_don_cho_xac_nhan_moi_shop, buyer_toi_da_don_moi_ngay, bank_ten, bank_so_tk, bank_chu_tk, bank_bin, dn_ten_phap_nhan, dn_mst, dn_dia_chi, dn_nguoi_dai_dien, dn_email_hoa_don, xuat_hoa_don_bat, ghi_chu, cap_nhat_boi, cap_nhat_luc, tao_luc";

function clampNgayDon(n: number | null | undefined, fallback: number): number {
  if (n == null || !Number.isFinite(Number(n)) || Number(n) < 0) return fallback;
  return Math.min(90, Math.floor(Number(n)));
}

/** Soft-limit: null → default; cho phép 0 = tắt. */
function clampBuyerLimit(
  n: number | null | undefined,
  fallback: number,
): number {
  if (n == null || !Number.isFinite(Number(n)) || Number(n) < 0) return fallback;
  return Math.min(500, Math.floor(Number(n)));
}

function mapBuyerLimit(row: DbRow): CinsTaiChinhShopBuyerLimit {
  const d = SHOP_BUYER_LIMIT_DEFAULTS;
  return {
    toiDaDonChoXacNhan: clampBuyerLimit(
      row.buyer_toi_da_don_cho_xac_nhan,
      d.toiDaDonChoXacNhan,
    ),
    toiDaDonChoXacNhanMoiShop: clampBuyerLimit(
      row.buyer_toi_da_don_cho_xac_nhan_moi_shop,
      d.toiDaDonChoXacNhanMoiShop,
    ),
    toiDaDonMoiNgay: clampBuyerLimit(
      row.buyer_toi_da_don_moi_ngay,
      d.toiDaDonMoiNgay,
    ),
  };
}

function mapDongDon(row: DbRow): CinsTaiChinhShopDongDon {
  const d = SHOP_DONG_DON_DEFAULTS;
  return {
    ngayKhaoSatSuKien: clampNgayDon(
      row.shop_ngay_khao_sat_su_kien,
      d.ngayKhaoSatSuKien,
    ),
    ngayKhaoSatTrucTiep: clampNgayDon(
      row.shop_ngay_khao_sat_truc_tiep,
      d.ngayKhaoSatTrucTiep,
    ),
    ngayKhaoSatOnline: clampNgayDon(
      row.shop_ngay_khao_sat_online,
      d.ngayKhaoSatOnline,
    ),
    ngayTuDongSuKien: clampNgayDon(
      row.shop_ngay_tu_dong_su_kien,
      d.ngayTuDongSuKien,
    ),
    ngayTuDongTrucTiep: clampNgayDon(
      row.shop_ngay_tu_dong_truc_tiep,
      d.ngayTuDongTrucTiep,
    ),
    ngayTuDongOnline: clampNgayDon(
      row.shop_ngay_tu_dong_online,
      d.ngayTuDongOnline,
    ),
    ngayTuDongOnlineKhongMa: clampNgayDon(
      row.shop_ngay_tu_dong_online_khong_ma,
      d.ngayTuDongOnlineKhongMa,
    ),
    soLanChoHoan: clampNgayDon(row.shop_so_lan_cho_hoan, d.soLanChoHoan),
    ngayHoanChuaNhan: clampNgayDon(
      row.shop_ngay_hoan_chua_nhan,
      d.ngayHoanChuaNhan,
    ),
  };
}
function clampTyLe(n: number): number {
  if (!Number.isFinite(n)) return CSDT_PHI_TY_LE_DEFAULT;
  return Math.min(1, Math.max(0, n));
}

function clampNguong(n: number): number {
  if (!Number.isFinite(n) || n < 0) return CSDT_PHI_NGUONG_VND_DEFAULT;
  return Math.floor(n);
}

function clampSoNgay(n: number): number {
  if (!Number.isFinite(n) || n < 0) return CSDT_PHI_SO_NGAY_HAN_DEFAULT;
  return Math.min(90, Math.floor(n));
}

function clampToiThieu(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(Number(n)) || Number(n) < 0) {
    return SHOP_PHI_TOI_THIEU_XUAT_KY_DEFAULT;
  }
  return Math.floor(Number(n));
}

function mapRow(row: DbRow): CinsTaiChinh {
  const shopTy =
    row.shop_ty_le == null
      ? SHOP_PHI_TY_LE_DEFAULT
      : clampTyLe(Number(row.shop_ty_le));
  const shopHan =
    row.so_ngay_han_tra == null
      ? CSDT_PHI_SO_NGAY_HAN_DEFAULT
      : clampSoNgay(Number(row.so_ngay_han_tra));
  const anHan =
    row.so_ngay_an_han_tu_khai == null
      ? 3
      : clampSoNgay(Number(row.so_ngay_an_han_tu_khai));
  return {
    id: row.id,
    csdt: {
      tyLe: clampTyLe(Number(row.csdt_ty_le)),
      nguongVnd: clampNguong(Number(row.csdt_nguong_kich_hoat_vnd)),
      soNgayHanTra: clampSoNgay(Number(row.csdt_so_ngay_han_tra)),
      nguongEgressGb:
        row.csdt_nguong_egress_gb == null
          ? null
          : Math.max(1, Math.floor(Number(row.csdt_nguong_egress_gb))),
    },
    shop: {
      tyLe: shopTy,
      nguongVnd:
        row.shop_nguong_kich_hoat_vnd == null
          ? SHOP_PHI_NGUONG_KICH_HOAT_DEFAULT
          : Math.max(0, Math.floor(Number(row.shop_nguong_kich_hoat_vnd))),
      toiThieuXuatKyVnd: clampToiThieu(row.shop_toi_thieu_xuat_ky_vnd),
      soNgayHanTra: shopHan,
      soNgayAnHanTuKhai: anHan,
      dongDon: mapDongDon(row),
      buyerLimit: mapBuyerLimit(row),
    },
    bank: {
      ten: row.bank_ten,
      soTk: row.bank_so_tk,
      chuTk: row.bank_chu_tk,
      bin: row.bank_bin,
    },
    doanhNghiep: {
      tenPhapNhan: row.dn_ten_phap_nhan,
      mst: row.dn_mst,
      diaChi: row.dn_dia_chi,
      nguoiDaiDien: row.dn_nguoi_dai_dien,
      emailHoaDon: row.dn_email_hoa_don,
    },
    xuatHoaDonBat: Boolean(row.xuat_hoa_don_bat),
    ghiChu: row.ghi_chu,
    capNhatBoi: row.cap_nhat_boi,
    capNhatLuc: row.cap_nhat_luc,
    taoLuc: row.tao_luc,
  };
}

function defaultsFromEnv(): Omit<CinsTaiChinh, "id" | "capNhatBoi" | "capNhatLuc" | "taoLuc" | "ghiChu"> {
  let tyLe = CSDT_PHI_TY_LE_DEFAULT;
  const envTy = process.env.CSDT_PHI_TY_LE?.trim();
  if (envTy) {
    const n = Number(envTy);
    if (Number.isFinite(n) && n >= 0 && n <= 1) tyLe = n;
  }
  let nguong = CSDT_PHI_NGUONG_VND_DEFAULT;
  const envNg = process.env.CSDT_PHI_NGUONG_VND?.trim();
  if (envNg) {
    const n = Number(envNg);
    if (Number.isFinite(n) && n >= 0) nguong = Math.floor(n);
  }
  return {
    csdt: {
      tyLe,
      nguongVnd: nguong,
      soNgayHanTra: CSDT_PHI_SO_NGAY_HAN_DEFAULT,
      nguongEgressGb: null,
    },
    shop: {
      tyLe: SHOP_PHI_TY_LE_DEFAULT,
      nguongVnd: SHOP_PHI_NGUONG_KICH_HOAT_DEFAULT,
      toiThieuXuatKyVnd: SHOP_PHI_TOI_THIEU_XUAT_KY_DEFAULT,
      soNgayHanTra: CSDT_PHI_SO_NGAY_HAN_DEFAULT,
      soNgayAnHanTuKhai: 3,
      dongDon: { ...SHOP_DONG_DON_DEFAULTS },
      buyerLimit: { ...SHOP_BUYER_LIMIT_DEFAULTS },
    },
    bank: { ten: null, soTk: null, chuTk: null, bin: null },
    doanhNghiep: {
      tenPhapNhan: null,
      mst: null,
      diaChi: null,
      nguoiDaiDien: null,
      emailHoaDon: null,
    },
    xuatHoaDonBat: false,
  };
}

async function fetchLatestRow(): Promise<DbRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .select(SELECT_COLS)
    .order("cap_nhat_luc", { ascending: false })
    .limit(1)
    .maybeSingle<DbRow>();
  if (error) {
    console.error("[cins] getCinsTaiChinh", error.message);
    return null;
  }
  return data;
}

/**
 * Đọc cấu hình tài chính active (dòng `cap_nhat_luc` mới nhất).
 * DB → env → default. Không trả secret.
 */
export async function getCinsTaiChinh(): Promise<CinsTaiChinh> {
  const row = await fetchLatestRow();
  if (row) return mapRow(row);

  const d = defaultsFromEnv();
  const now = new Date().toISOString();
  return {
    id: "",
    ...d,
    ghiChu: null,
    capNhatBoi: null,
    capNhatLuc: now,
    taoLuc: now,
  };
}

/** Lịch sử thay đổi (mới → cũ), tối đa `limit` dòng. */
export async function listCinsTaiChinhLichSu(
  limit = 20,
): Promise<CinsTaiChinh[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .select(SELECT_COLS)
    .order("cap_nhat_luc", { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)));
  if (error) {
    console.error("[cins] listCinsTaiChinhLichSu", error.message);
    return [];
  }
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export type CinsTaiChinhKhoi =
  | "ty_le"
  | "shop"
  | "dong_don"
  | "buyer_limit"
  | "egress"
  | "stk"
  | "doanh_nghiep";

export type CinsTaiChinhPatch = {
  khoi: CinsTaiChinhKhoi;
  /** Bắt buộc khi khoi = ty_le | shop | dong_don | buyer_limit */
  ghiChu?: string | null;
  csdtTyLe?: number;
  csdtNguongVnd?: number;
  csdtSoNgayHanTra?: number;
  shopTyLe?: number;
  shopNguongVnd?: number;
  shopToiThieuXuatKyVnd?: number;
  shopSoNgayHanTra?: number;
  shopSoNgayAnHanTuKhai?: number;
  shopNgayKhaoSatSuKien?: number;
  shopNgayKhaoSatTrucTiep?: number;
  shopNgayKhaoSatOnline?: number;
  shopNgayTuDongSuKien?: number;
  shopNgayTuDongTrucTiep?: number;
  shopNgayTuDongOnline?: number;
  shopNgayTuDongOnlineKhongMa?: number;
  shopSoLanChoHoan?: number;
  shopNgayHoanChuaNhan?: number;
  buyerToiDaDonChoXacNhan?: number;
  buyerToiDaDonChoXacNhanMoiShop?: number;
  buyerToiDaDonMoiNgay?: number;
  /** null / undefined trống = tắt */
  csdtNguongEgressGb?: number | null;
  bankTen?: string | null;
  bankSoTk?: string | null;
  bankChuTk?: string | null;
  bankBin?: string | null;
  dnTenPhapNhan?: string | null;
  dnMst?: string | null;
  dnDiaChi?: string | null;
  dnNguoiDaiDien?: string | null;
  dnEmailHoaDon?: string | null;
  xuatHoaDonBat?: boolean;
};

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

/**
 * Insert dòng mới (giữ lịch sử). Không UPDATE tại chỗ.
 * `khoi=ty_le` bắt buộc `ghiChu` không rỗng.
 */
export async function setCinsTaiChinh(
  patch: CinsTaiChinhPatch,
  actorId: string,
): Promise<{ ok: true; cauHinh: CinsTaiChinh } | { ok: false; error: string }> {
  const current = await getCinsTaiChinh();
  const now = new Date().toISOString();

  let tyLe = current.csdt.tyLe;
  let nguong = current.csdt.nguongVnd;
  let soNgay = current.csdt.soNgayHanTra;
  let egress = current.csdt.nguongEgressGb;
  let shopTyLe = current.shop.tyLe;
  let shopNguong = current.shop.nguongVnd;
  let shopToiThieu = current.shop.toiThieuXuatKyVnd;
  let shopSoNgay = current.shop.soNgayHanTra;
  let shopAnHan = current.shop.soNgayAnHanTuKhai;
  let dongDon = { ...current.shop.dongDon };
  let buyerLimit = { ...current.shop.buyerLimit };
  let bankTen = current.bank.ten;
  let bankSoTk = current.bank.soTk;
  let bankChuTk = current.bank.chuTk;
  let bankBin = current.bank.bin;
  let dnTen = current.doanhNghiep.tenPhapNhan;
  let dnMst = current.doanhNghiep.mst;
  let dnDiaChi = current.doanhNghiep.diaChi;
  let dnNguoi = current.doanhNghiep.nguoiDaiDien;
  let dnEmail = current.doanhNghiep.emailHoaDon;
  let xuatHd = current.xuatHoaDonBat;
  let ghiChu: string | null = null;

  switch (patch.khoi) {
    case "ty_le": {
      const note = emptyToNull(patch.ghiChu);
      if (!note) {
        return {
          ok: false,
          error: "Đổi tỷ lệ/ngưỡng bắt buộc ghi chú lý do (giống phiên bản công thức feed).",
        };
      }
      if (typeof patch.csdtTyLe !== "number" || !Number.isFinite(patch.csdtTyLe)) {
        return { ok: false, error: "csdtTyLe không hợp lệ (0–1)." };
      }
      if (
        typeof patch.csdtNguongVnd !== "number" ||
        !Number.isFinite(patch.csdtNguongVnd) ||
        patch.csdtNguongVnd < 0
      ) {
        return { ok: false, error: "Ngưỡng kích hoạt phải ≥ 0." };
      }
      if (
        typeof patch.csdtSoNgayHanTra !== "number" ||
        !Number.isFinite(patch.csdtSoNgayHanTra) ||
        patch.csdtSoNgayHanTra < 0
      ) {
        return { ok: false, error: "Số ngày hạn trả phải ≥ 0." };
      }
      tyLe = clampTyLe(patch.csdtTyLe);
      nguong = clampNguong(patch.csdtNguongVnd);
      soNgay = clampSoNgay(patch.csdtSoNgayHanTra);
      ghiChu = note;
      break;
    }
    case "shop": {
      const note = emptyToNull(patch.ghiChu);
      if (!note) {
        return {
          ok: false,
          error: "Đổi phí shop bắt buộc ghi chú lý do.",
        };
      }
      if (typeof patch.shopTyLe !== "number" || !Number.isFinite(patch.shopTyLe)) {
        return { ok: false, error: "shopTyLe không hợp lệ (0–1)." };
      }
      if (
        typeof patch.shopToiThieuXuatKyVnd !== "number" ||
        !Number.isFinite(patch.shopToiThieuXuatKyVnd) ||
        patch.shopToiThieuXuatKyVnd < 0
      ) {
        return { ok: false, error: "Tối thiểu xuất kỳ phải ≥ 0." };
      }
      shopTyLe = clampTyLe(patch.shopTyLe);
      shopNguong =
        typeof patch.shopNguongVnd === "number" &&
        Number.isFinite(patch.shopNguongVnd) &&
        patch.shopNguongVnd >= 0
          ? Math.floor(patch.shopNguongVnd)
          : shopNguong;
      shopToiThieu = clampToiThieu(patch.shopToiThieuXuatKyVnd);
      if (
        typeof patch.shopSoNgayHanTra === "number" &&
        Number.isFinite(patch.shopSoNgayHanTra)
      ) {
        shopSoNgay = clampSoNgay(patch.shopSoNgayHanTra);
      }
      if (
        typeof patch.shopSoNgayAnHanTuKhai === "number" &&
        Number.isFinite(patch.shopSoNgayAnHanTuKhai)
      ) {
        shopAnHan = clampSoNgay(patch.shopSoNgayAnHanTuKhai);
      }
      ghiChu = note;
      break;
    }
    case "dong_don": {
      const note = emptyToNull(patch.ghiChu);
      if (!note) {
        return {
          ok: false,
          error: "Đổi lịch đóng đơn bắt buộc ghi chú lý do.",
        };
      }
      const req = (
        v: number | undefined,
        label: string,
      ): number | { err: string } => {
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
          return { err: `${label} không hợp lệ.` };
        }
        return Math.min(90, Math.floor(v));
      };
      const a = req(patch.shopNgayKhaoSatSuKien, "Khảo sát sự kiện");
      const b = req(patch.shopNgayKhaoSatTrucTiep, "Khảo sát trực tiếp");
      const c = req(patch.shopNgayKhaoSatOnline, "Khảo sát online");
      const d = req(patch.shopNgayTuDongSuKien, "Tự đóng sự kiện");
      const e = req(patch.shopNgayTuDongTrucTiep, "Tự đóng trực tiếp");
      const f = req(patch.shopNgayTuDongOnline, "Tự đóng online");
      const g = req(
        patch.shopNgayTuDongOnlineKhongMa,
        "Tự đóng online không mã",
      );
      const h = req(patch.shopSoLanChoHoan, "Số lần hoãn");
      const i = req(patch.shopNgayHoanChuaNhan, "Ngày hoãn chưa nhận");
      for (const x of [a, b, c, d, e, f, g, h, i]) {
        if (typeof x === "object") return { ok: false, error: x.err };
      }
      dongDon = {
        ngayKhaoSatSuKien: a as number,
        ngayKhaoSatTrucTiep: b as number,
        ngayKhaoSatOnline: c as number,
        ngayTuDongSuKien: d as number,
        ngayTuDongTrucTiep: e as number,
        ngayTuDongOnline: f as number,
        ngayTuDongOnlineKhongMa: g as number,
        soLanChoHoan: h as number,
        ngayHoanChuaNhan: i as number,
      };
      ghiChu = note;
      break;
    }
    case "buyer_limit": {
      const note = emptyToNull(patch.ghiChu);
      if (!note) {
        return {
          ok: false,
          error: "Đổi soft-limit buyer bắt buộc ghi chú lý do.",
        };
      }
      const req = (
        v: number | undefined,
        label: string,
      ): number | { err: string } => {
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
          return { err: `${label} không hợp lệ (0 = tắt).` };
        }
        return Math.min(500, Math.floor(v));
      };
      const a = req(patch.buyerToiDaDonChoXacNhan, "Tối đa đơn chờ xác nhận");
      const b = req(
        patch.buyerToiDaDonChoXacNhanMoiShop,
        "Tối đa chờ xác nhận / shop",
      );
      const c = req(patch.buyerToiDaDonMoiNgay, "Tối đa đơn mới / ngày");
      for (const x of [a, b, c]) {
        if (typeof x === "object") return { ok: false, error: x.err };
      }
      buyerLimit = {
        toiDaDonChoXacNhan: a as number,
        toiDaDonChoXacNhanMoiShop: b as number,
        toiDaDonMoiNgay: c as number,
      };
      ghiChu = note;
      break;
    }
    case "egress": {
      if (patch.csdtNguongEgressGb === null || patch.csdtNguongEgressGb === undefined) {
        egress = null;
      } else if (
        typeof patch.csdtNguongEgressGb === "number" &&
        Number.isFinite(patch.csdtNguongEgressGb) &&
        patch.csdtNguongEgressGb > 0
      ) {
        egress = Math.floor(patch.csdtNguongEgressGb);
      } else {
        return {
          ok: false,
          error:
            "Ngưỡng dung lượng phòng học (GB) phải > 0 hoặc để trống (tắt).",
        };
      }
      ghiChu =
        emptyToNull(patch.ghiChu) ??
        (egress == null
          ? "Tắt ngưỡng dung lượng phòng học"
          : `Đặt ngưỡng dung lượng phòng học ${egress} GB`);
      break;
    }
    case "stk": {
      bankBin = emptyToNull(patch.bankBin)?.toUpperCase() ?? null;
      bankSoTk = emptyToNull(patch.bankSoTk);
      bankChuTk = emptyToNull(patch.bankChuTk);
      const tenTuCode = tenNganHangTuCode(bankBin);
      bankTen =
        emptyToNull(patch.bankTen) ?? tenTuCode ?? bankTen;
      ghiChu = emptyToNull(patch.ghiChu) ?? "Cập nhật STK nhận phí";
      break;
    }
    case "doanh_nghiep": {
      dnTen = emptyToNull(patch.dnTenPhapNhan);
      dnMst = emptyToNull(patch.dnMst);
      dnDiaChi = emptyToNull(patch.dnDiaChi);
      dnNguoi = emptyToNull(patch.dnNguoiDaiDien);
      dnEmail = emptyToNull(patch.dnEmailHoaDon);
      if (typeof patch.xuatHoaDonBat === "boolean") {
        xuatHd = patch.xuatHoaDonBat;
      }
      ghiChu = emptyToNull(patch.ghiChu) ?? "Cập nhật thông tin doanh nghiệp CINs";
      break;
    }
    default:
      return { ok: false, error: "khoi không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_cau_hinh_tai_chinh")
    .insert({
      csdt_ty_le: tyLe,
      csdt_nguong_kich_hoat_vnd: nguong,
      csdt_so_ngay_han_tra: soNgay,
      csdt_nguong_egress_gb: egress,
      shop_ty_le: shopTyLe,
      shop_nguong_kich_hoat_vnd: shopNguong,
      shop_toi_thieu_xuat_ky_vnd: shopToiThieu,
      so_ngay_han_tra: shopSoNgay,
      so_ngay_an_han_tu_khai: shopAnHan,
      shop_ngay_khao_sat_su_kien: dongDon.ngayKhaoSatSuKien,
      shop_ngay_khao_sat_truc_tiep: dongDon.ngayKhaoSatTrucTiep,
      shop_ngay_khao_sat_online: dongDon.ngayKhaoSatOnline,
      shop_ngay_tu_dong_su_kien: dongDon.ngayTuDongSuKien,
      shop_ngay_tu_dong_truc_tiep: dongDon.ngayTuDongTrucTiep,
      shop_ngay_tu_dong_online: dongDon.ngayTuDongOnline,
      shop_ngay_tu_dong_online_khong_ma: dongDon.ngayTuDongOnlineKhongMa,
      shop_so_lan_cho_hoan: dongDon.soLanChoHoan,
      shop_ngay_hoan_chua_nhan: dongDon.ngayHoanChuaNhan,
      buyer_toi_da_don_cho_xac_nhan: buyerLimit.toiDaDonChoXacNhan,
      buyer_toi_da_don_cho_xac_nhan_moi_shop:
        buyerLimit.toiDaDonChoXacNhanMoiShop,
      buyer_toi_da_don_moi_ngay: buyerLimit.toiDaDonMoiNgay,
      bank_ten: bankTen,
      bank_so_tk: bankSoTk,
      bank_chu_tk: bankChuTk,
      bank_bin: bankBin,
      dn_ten_phap_nhan: dnTen,
      dn_mst: dnMst,
      dn_dia_chi: dnDiaChi,
      dn_nguoi_dai_dien: dnNguoi,
      dn_email_hoa_don: dnEmail,
      xuat_hoa_don_bat: xuatHd,
      ghi_chu: ghiChu,
      cap_nhat_boi: actorId,
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select(SELECT_COLS)
    .single<DbRow>();

  if (error || !data) {
    console.error("[cins] setCinsTaiChinh", error?.message);
    return { ok: false, error: "Không lưu được cấu hình." };
  }
  return { ok: true, cauHinh: mapRow(data) };
}
