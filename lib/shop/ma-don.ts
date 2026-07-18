import { normalizeSearchText } from "@/lib/search/normalize";

/** Prefix từ tên người mua — chữ không dấu, tối đa 12 ký tự. */
export function shopMaDonPrefix(buyerName: string | null | undefined): string {
  const raw = normalizeSearchText(buyerName ?? "")
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
  return raw || "BUYER";
}

/**
 * Mã đơn: `TENNGUOIMUA-48291` — prefix theo tên người mua + số ngẫu nhiên.
 * Uniqueness cứng: unique index `ma_don` + retry khi trùng.
 */
export function buildShopMaDon(buyerName: string | null | undefined): string {
  const prefix = shopMaDonPrefix(buyerName);
  const n = String(Math.floor(10_000 + Math.random() * 90_000));
  return `${prefix}-${n}`;
}

const MA_DON_RE = /^[A-Z0-9]{2,12}-\d{4,6}$/;

export function isValidShopMaDon(value: string): boolean {
  return MA_DON_RE.test(value.trim().toUpperCase());
}

export function normalizeShopMaDon(value: string): string {
  return value.trim().toUpperCase();
}
