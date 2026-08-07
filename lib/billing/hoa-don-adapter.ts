import "server-only";

import { createHash } from "node:crypto";

import { cuoiThang, tienPhaiTra } from "@/lib/co-so/phi-config";
import type { OrgPhiKyRow } from "@/lib/co-so/phi-ky";
import type { ShopPhiKy } from "@/lib/shop/phi";
import { todayYmdVn } from "@/lib/co-so/ky-hoc";

import type { HoaDon, HoaDonTrangThai } from "./types";

/**
 * Mã CK display cho shop (P1) — chưa persist vào shop_phi_ky.
 * Cùng salt với CSĐT để format thống nhất; Sepay auto-match shop → P2.
 */
export function maThamChieuShopDisplay(
  sellerId: string,
  kyYmd: string,
): string {
  const salt = process.env.CSDT_PHI_MA_SALT?.trim() || "cins-shop-p1";
  const yymm = kyYmd.replace(/-/g, "").slice(2, 6);
  const hex = createHash("sha256")
    .update(`${salt}:shop:${sellerId}:${kyYmd}`)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `CINS${hex}${yymm}`;
}

/** Chuẩn hoá ngày shop (UTC date string) → YMD hiển thị VN (giữ nguyên chuỗi date). */
function shopYmdAsVn(ymd: string | null | undefined): string | null {
  if (!ymd) return null;
  /* Đã là YYYY-MM-DD — dùng trực tiếp làm lịch VN (B3: hiển thị thống nhất). */
  return ymd.slice(0, 10);
}

function endOfMonthYmd(ymd: string): string {
  return cuoiThang(ymd.slice(0, 10));
}

export function adaptOrgPhiKyToHoaDon(
  ky: OrgPhiKyRow,
  meta: {
    idDichVu: string | null;
    tenDichVu: string;
  },
): HoaDon {
  const soTien = tienPhaiTra(ky.phiPhaiTraVnd, ky.dieuChinhVnd);
  const conNo = Math.max(0, soTien - ky.daTraVnd);
  return {
    id: ky.id,
    nguon: "org_phi_ky",
    idDichVu: meta.idDichVu,
    loai: "csdt_phi",
    thamChieuId: ky.idToChuc,
    tenDichVu: meta.tenDichVu,
    tuNgay: ky.tuNgay,
    denNgay: ky.denNgay,
    ngayChot: ky.ngayChot,
    hanTra: ky.hanTra,
    doanhThuVnd: ky.doanhThuGhiNhanVnd,
    tyLe: ky.tyLe,
    soTienVnd: soTien,
    dieuChinhVnd: ky.dieuChinhVnd,
    daTraVnd: ky.daTraVnd,
    conNoVnd: ky.trangThai === "da_tra" || ky.trangThai === "mien" ? 0 : conNo,
    trangThai: ky.trangThai,
    maThamChieu: ky.maThamChieu,
    nguonId: ky.id,
  };
}

export function adaptShopPhiKyToHoaDon(
  ky: ShopPhiKy,
  meta: {
    idDichVu: string | null;
    tenDichVu: string;
  },
): HoaDon {
  const kyYmd = shopYmdAsVn(ky.ky) ?? ky.ky.slice(0, 10);
  const denNgay = endOfMonthYmd(kyYmd);
  const soTien = Math.max(0, Math.round(ky.phiPhaiTra));
  const trangThai = ky.trangThai as HoaDonTrangThai;
  const conNo =
    trangThai === "da_tra" ||
    trangThai === "mien" ||
    trangThai === "chua_chot"
      ? 0
      : soTien;

  return {
    id: ky.id,
    nguon: "shop_phi_ky",
    idDichVu: meta.idDichVu,
    loai: "shop_phi",
    thamChieuId: ky.idNguoiBan,
    tenDichVu: meta.tenDichVu,
    tuNgay: kyYmd,
    denNgay,
    ngayChot: denNgay,
    hanTra: shopYmdAsVn(ky.hanTra),
    doanhThuVnd: Math.max(0, Math.round(ky.gmvGhiNhan)),
    tyLe: ky.tyLe,
    soTienVnd: soTien,
    dieuChinhVnd: 0,
    daTraVnd: trangThai === "da_tra" ? soTien : 0,
    conNoVnd: conNo,
    trangThai,
    maThamChieu:
      conNo > 0 ? maThamChieuShopDisplay(ky.idNguoiBan, kyYmd) : null,
    nguonId: ky.id,
  };
}

/** Sắp xếp: còn nợ trước, hạn gần nhất, rồi mới nhất. */
export function sortHoaDon(a: HoaDon, b: HoaDon): number {
  const aNo = a.conNoVnd > 0 ? 0 : 1;
  const bNo = b.conNoVnd > 0 ? 0 : 1;
  if (aNo !== bNo) return aNo - bNo;
  const aHan = a.hanTra ?? "9999-99-99";
  const bHan = b.hanTra ?? "9999-99-99";
  if (aHan !== bHan) return aHan < bHan ? -1 : 1;
  return a.ngayChot < b.ngayChot ? 1 : a.ngayChot > b.ngayChot ? -1 : 0;
}

export function pickUuTienThanhToan(hoaDon: HoaDon[]): HoaDon | null {
  const no = hoaDon.filter((h) => h.conNoVnd > 0);
  if (no.length === 0) return null;
  const today = todayYmdVn();
  const sorted = [...no].sort((a, b) => {
    const aOver = a.hanTra && a.hanTra < today ? 0 : 1;
    const bOver = b.hanTra && b.hanTra < today ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    const aHan = a.hanTra ?? "9999-99-99";
    const bHan = b.hanTra ?? "9999-99-99";
    return aHan < bHan ? -1 : aHan > bHan ? 1 : 0;
  });
  return sorted[0] ?? null;
}
