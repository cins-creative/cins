import "server-only";

import { createHash } from "node:crypto";

import { todayYmdVn } from "@/lib/co-so/ky-hoc";

/** Làm tròn VND (≥ 0). */
export function roundVnd(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** Số phải trả thực tế = max(0, phi_phai_tra + dieu_chinh). */
export function tienPhaiTra(phiPhaiTraVnd: number, dieuChinhVnd: number): number {
  return Math.max(0, roundVnd(phiPhaiTraVnd) + Math.round(dieuChinhVnd));
}

/** Ngày cuối tháng của `ymd` (YYYY-MM-DD), lịch VN. */
export function cuoiThang(ymd: string): string {
  const [y, m] = ymd.split("-").map((x) => Number(x));
  if (!y || !m) return ymd;
  /* Ngày 0 tháng kế = cuối tháng hiện tại (local UTC+7 noon tránh DST edge). */
  const d = new Date(Date.UTC(y, m, 0, 12, 0, 0));
  const yy = d.getUTCFullYear();
  const mm = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Hạn trả = ngay_chot + soNgay (lịch). */
export function hanTra(ngayChotYmd: string, soNgay: number): string {
  const n = Math.max(0, Math.floor(soNgay));
  const start = Date.parse(`${ngayChotYmd}T00:00:00+07:00`);
  if (!Number.isFinite(start)) return ngayChotYmd;
  const end = new Date(start + n * 86_400_000);
  return todayYmdVn(end);
}

/**
 * Ân hạn theo lúc thông báo (P0 A3): nếu ngày chốt đã qua thì tính hạn từ hôm nay,
 * không từ ngày chốt quá khứ — tránh chốt bù nhiều tháng → khóa ngay.
 * Vẫn thỏa CHECK `han_tra >= ngay_chot`.
 */
export function hanTraTuThongBao(
  ngayChotYmd: string,
  soNgay: number,
  now = new Date(),
): string {
  const today = todayYmdVn(now);
  const base = ngayChotYmd < today ? today : ngayChotYmd;
  return hanTra(base, soNgay);
}

/** Cộng `days` ngày lịch vào YYYY-MM-DD (VN). */
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  d.setTime(d.getTime() + days * 86_400_000);
  return todayYmdVn(d);
}

/** Tháng kế tiếp của YYYY-MM-DD → ngày bất kỳ trong tháng đó (giữ ngày, kẹp cuối tháng). */
export function thangKeTiepYmd(ymd: string): string {
  const [y, m] = ymd.split("-").map((x) => Number(x));
  if (!y || !m) return ymd;
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return cuoiThang(`${ny}-${String(nm).padStart(2, "0")}-01`);
}

/**
 * Mã CK Sepay: `CINS` + 6 hex + `YYMM`.
 * Salt từ `CSDT_PHI_MA_SALT` (env) — tránh đoán mã từ orgId công khai (P0 B1).
 * `attempt` > 0 khi đụng UNIQUE và cần retry.
 * VD `CINS7F3A9C2604`. ≤ 25 ký tự.
 */
export function maThamChieu(
  orgId: string,
  ngayChotYmd: string,
  attempt = 0,
): string {
  const salt = (process.env.CSDT_PHI_MA_SALT ?? "").trim();
  const hash = createHash("sha256")
    .update(
      `${salt}:${orgId.trim().toLowerCase()}:${Math.max(0, Math.floor(attempt))}`,
    )
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  const compact = ngayChotYmd.replace(/-/g, "");
  const yymm =
    compact.length >= 6 ? compact.slice(2, 6) : compact.slice(0, 4);
  return `CINS${hash}${yymm}`;
}

/** YYYY-MM-DD từ timestamptz theo VN. */
export function ymdVnFromIso(iso: string): string {
  return todayYmdVn(new Date(iso));
}
