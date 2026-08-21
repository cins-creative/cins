import { intlLocale, type CinsLocale } from "@/lib/locale/types";

/**
 * Format số/ngày/tiền theo locale (PLAN_GLOBAL_SURFACE §3, 0.4).
 * Tiền LUÔN là VND (`₫`) — chỉ đổi cách nhóm chữ số theo locale, KHÔNG quy đổi tỉ giá.
 *
 * Dùng thay cho `toLocaleString("vi-VN")` / `Intl.*("vi-VN")` inline trên bề mặt public.
 */

export function formatNumber(
  value: number,
  locale: CinsLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

/** Tiền VND — `₫1,000` (en) · `1.000 ₫` (vi). Không phần thập phân. */
export function formatCurrency(value: number, locale: CinsLocale): string {
  return formatMoney(value, locale, "VND");
}

/** Tiền theo mã ISO — mặc định VND. Không quy đổi tỉ giá. */
export function formatMoney(
  value: number,
  locale: CinsLocale,
  currency = "VND",
): string {
  const n = Number.isFinite(value) ? value : 0;
  const code = currency || "VND";
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "VND" ? 0 : 2,
    }).format(n);
  } catch {
    return `${formatNumber(n, locale)} ${code}`;
  }
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: Date | string | number,
  locale: CinsLocale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(
    toDate(value),
  );
}

export function formatMonthYear(
  value: Date | string | number,
  locale: CinsLocale,
): string {
  return formatDate(value, locale, { year: "numeric", month: "long" });
}

/** Thời gian tương đối — `3 phút trước` / `3 minutes ago`. Quá ~30 ngày → ngày tuyệt đối. */
export function formatRelativeTime(
  value: Date | string | number,
  locale: CinsLocale,
): string {
  const then = toDate(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), {
    numeric: "auto",
  });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(value, locale);
}
