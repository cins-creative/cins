import { normalizeSearchText } from "@/lib/search/normalize";

/**
 * Mã đơn học phí (variant A): `{MÃKHÓA}{MÃLỚP}{5 số}` — uppercase, bỏ khoảng/ký tự lạ.
 * Ví dụ: BCM + Onl 2 + 48291 → `BCMONL248291`.
 * Unique partial index `uq_org_don_hoc_phi_ma_don` → caller retry khi 23505.
 */

export function hocPhiMaPart(
  raw: string | null | undefined,
  fallback: string,
): string {
  const cleaned = normalizeSearchText(raw ?? "")
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 24);
  return cleaned || fallback;
}

export function buildHocPhiMaDon(
  maKhoaHoc: string | null | undefined,
  maLop: string | null | undefined,
): string {
  const khoa = hocPhiMaPart(maKhoaHoc, "KHOA");
  const lop = hocPhiMaPart(maLop, "LOP");
  const n = String(Math.floor(10_000 + Math.random() * 90_000));
  return `${khoa}${lop}${n}`;
}

export function isHocPhiMaDonUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return String((error as { code?: string }).code) === "23505";
}
