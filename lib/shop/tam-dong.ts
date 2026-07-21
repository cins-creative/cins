/** Trường tạm đóng trên `shop_cua_hang` — dùng chung client + server. */
export type ShopTamDongFields = {
  tamDong: boolean;
  tamDongTu: string | null;
  tamDongDen: string | null;
  tamDongLyDo?: string | null;
};

/** Giới hạn ký tự lý do nghỉ (khớp API + DB trim). */
export const SHOP_TAM_DONG_LY_DO_MAX = 280;

export function normalizeShopTamDongLyDo(
  value: string | null | undefined,
): string | null {
  const t = value?.trim() || null;
  if (!t) return null;
  return t.length > SHOP_TAM_DONG_LY_DO_MAX
    ? t.slice(0, SHOP_TAM_DONG_LY_DO_MAX)
    : t;
}

/**
 * Đang nghỉ: bật cờ + có `tamDongTu` + now ≥ tu.
 * Có `tamDongDen` → đóng đến den; không có → đóng vô hạn (không countdown).
 */
export function isShopTamDongActive(
  shop: ShopTamDongFields | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!shop?.tamDong) return false;
  if (!shop.tamDongTu) return false;
  const tu = Date.parse(shop.tamDongTu);
  if (!Number.isFinite(tu) || nowMs < tu) return false;
  if (!shop.tamDongDen) return true;
  const den = Date.parse(shop.tamDongDen);
  if (!Number.isFinite(den) || den <= tu) return false;
  return nowMs < den;
}

/** Có ngày mở lại hợp lệ → hiện đếm ngược. */
export function hasShopTamDongCountdown(
  shop: ShopTamDongFields | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!isShopTamDongActive(shop, nowMs)) return false;
  if (!shop?.tamDongDen) return false;
  const den = Date.parse(shop.tamDongDen);
  return Number.isFinite(den) && den > nowMs;
}

/** ms còn lại đến lúc mở lại; 0 nếu không có ngày mở lại / không còn đóng. */
export function shopTamDongRemainingMs(
  shop: ShopTamDongFields | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!hasShopTamDongCountdown(shop, nowMs) || !shop?.tamDongDen) return 0;
  const den = Date.parse(shop.tamDongDen);
  if (!Number.isFinite(den)) return 0;
  return Math.max(0, den - nowMs);
}

export function formatShopMoLaiLuc(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString("vi-VN");
  }
}

/** Đếm ngược compact: `2n 03:12:05` / `03:12:05` / `12:05`. */
export function formatShopCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) {
    return `${days}n ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/** `datetime-local` value từ ISO (theo giờ máy user). */
export function isoToDatetimeLocalValue(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO từ `datetime-local` (giờ máy user). */
export function datetimeLocalValueToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
