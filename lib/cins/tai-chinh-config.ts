import "server-only";

import { tenNganHangTuCode } from "@/lib/cins/tai-chinh-banks";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Fallback khi DB trống / lỗi đọc. */
export const CSDT_PHI_TY_LE_DEFAULT = 0.1;
export const CSDT_PHI_NGUONG_VND_DEFAULT = 2_000_000;
export const CSDT_PHI_SO_NGAY_HAN_DEFAULT = 7;

export type CinsTaiChinhCsdt = {
  tyLe: number;
  nguongVnd: number;
  soNgayHanTra: number;
  nguongEgressGb: number | null;
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
  "id, csdt_ty_le, csdt_nguong_kich_hoat_vnd, csdt_so_ngay_han_tra, csdt_nguong_egress_gb, bank_ten, bank_so_tk, bank_chu_tk, bank_bin, dn_ten_phap_nhan, dn_mst, dn_dia_chi, dn_nguoi_dai_dien, dn_email_hoa_don, xuat_hoa_don_bat, ghi_chu, cap_nhat_boi, cap_nhat_luc, tao_luc";

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

function mapRow(row: DbRow): CinsTaiChinh {
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
  | "egress"
  | "stk"
  | "doanh_nghiep";

export type CinsTaiChinhPatch = {
  khoi: CinsTaiChinhKhoi;
  /** Bắt buộc khi khoi = ty_le */
  ghiChu?: string | null;
  csdtTyLe?: number;
  csdtNguongVnd?: number;
  csdtSoNgayHanTra?: number;
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
        return { ok: false, error: "Ngưỡng egress GB phải > 0 hoặc để trống (tắt)." };
      }
      ghiChu = emptyToNull(patch.ghiChu) ?? (egress == null ? "Tắt ngưỡng egress" : `Đặt egress ${egress} GB`);
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
