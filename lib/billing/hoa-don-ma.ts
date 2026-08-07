import "server-only";

import { createHash } from "node:crypto";

import { todayYmdVn } from "@/lib/co-so/ky-hoc";
import { addDaysYmd, roundVnd } from "@/lib/co-so/phi-config";

const DEV_BILLING_MA_SALT_FALLBACK = "cins-billing";
let warnedMissingSalt = false;

/**
 * Salt mã CK hoá đơn hợp nhất — tái dùng `CSDT_PHI_MA_SALT`.
 * Production thiếu env → throw (không im lặng dùng default đoán được).
 * Dev giữ fallback + warn một lần.
 */
export function billingMaSalt(): string {
  const salt = process.env.CSDT_PHI_MA_SALT?.trim();
  if (salt) return salt;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing CSDT_PHI_MA_SALT — không được sinh mã CK với salt mặc định.",
    );
  }
  if (!warnedMissingSalt) {
    warnedMissingSalt = true;
    console.warn(
      "[billing] CSDT_PHI_MA_SALT chưa cấu hình — dùng salt dev tạm. Đặt env trước khi deploy.",
    );
  }
  return DEV_BILLING_MA_SALT_FALLBACK;
}

/**
 * Mã CK: `CINS` + 6 hex + YYMM. `attempt` khi retry UNIQUE.
 */
export function maThamChieuHoaDon(
  seed: string,
  ngayChotYmd: string,
  attempt = 0,
): string {
  const yymm = ngayChotYmd.replace(/-/g, "").slice(2, 6);
  const hex = createHash("sha256")
    .update(`${billingMaSalt()}:${seed}:${ngayChotYmd}:${attempt}`)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `CINS${hex}${yymm}`;
}

export function hanTraTuThongBaoYmd(
  soNgay: number,
  thongBaoLuc = new Date(),
  ngayChotYmd?: string,
): string {
  const today = todayYmdVn(thongBaoLuc);
  const base =
    ngayChotYmd && ngayChotYmd > today ? ngayChotYmd : today;
  return addDaysYmd(base, Math.max(0, Math.floor(soNgay)));
}

export function conNoHoaDon(input: {
  soTienVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  trangThai: string;
}): number {
  if (
    input.trangThai === "da_tra" ||
    input.trangThai === "mien" ||
    input.trangThai === "ngung_theo_doi"
  ) {
    return 0;
  }
  const phai = Math.max(
    0,
    roundVnd(input.soTienVnd) + Math.round(input.dieuChinhVnd),
  );
  return Math.max(0, phai - roundVnd(input.daTraVnd));
}
