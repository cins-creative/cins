import "server-only";

import PHUONG_XA_2025, {
  type PhuongXaEntry,
} from "@/lib/vn/phuong-xa-2025";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";

/**
 * Phường/xã VN sau sát nhập (34 tỉnh · 3.321 đơn vị cấp xã, hiệu lực 1/7/2025).
 * Dữ liệu sinh từ `scripts/gen-phuong-xa.mjs` (open-admin-data, CC-BY-4.0).
 * Nhóm theo mã enum tỉnh của CINs — xem `lib/truong/contact.ts`.
 */
export type PhuongXa = PhuongXaEntry;

const DATA = PHUONG_XA_2025;

/** Danh sách phường/xã của một tỉnh (đã sắp xếp theo tên Việt). */
export function getPhuongXaByTinh(tinhCode: string | null | undefined): PhuongXa[] {
  const code = normalizeTinhThanhForDb(tinhCode);
  if (!code) return [];
  return DATA[code] ?? [];
}

/** Tên phường/xã có thuộc tỉnh đã cho không. */
export function isValidPhuongXa(
  tinhCode: string | null | undefined,
  name: string | null | undefined,
): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;
  return getPhuongXaByTinh(tinhCode).some((w) => w.name === n);
}

/** Mã GSO của phường/xã theo tên + tỉnh. Null nếu không khớp. */
export function getPhuongXaCode(
  tinhCode: string | null | undefined,
  name: string | null | undefined,
): string | null {
  const n = (name ?? "").trim();
  if (!n) return null;
  const hit = getPhuongXaByTinh(tinhCode).find((w) => w.name === n);
  return hit?.code ?? null;
}
