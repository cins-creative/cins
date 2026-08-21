/**
 * Locale cho bề mặt public tiếng Anh (PLAN_GLOBAL_SURFACE §3).
 * Không phụ thuộc runtime (dùng được cả client + server) — helper thuần.
 */
export type CinsLocale = "en" | "vi";

export const CINS_LOCALE_COOKIE = "cins-locale";
export const CINS_LOCALE_HEADER = "x-cins-locale";
export const DEFAULT_LOCALE: CinsLocale = "vi";

export function isCinsLocale(value: unknown): value is CinsLocale {
  return value === "en" || value === "vi";
}

/** Chuẩn hoá về locale hợp lệ, fallback về `vi`. */
export function normalizeLocale(value: unknown): CinsLocale {
  return isCinsLocale(value) ? value : DEFAULT_LOCALE;
}

/** `<html lang>` — `en` | `vi`. */
export function htmlLang(locale: CinsLocale): string {
  return locale === "en" ? "en" : "vi";
}

/** `openGraph.locale` — `en_US` | `vi_VN`. */
export function ogLocale(locale: CinsLocale): string {
  return locale === "en" ? "en_US" : "vi_VN";
}

/** BCP-47 locale cho `Intl.*`. */
export function intlLocale(locale: CinsLocale): string {
  return locale === "en" ? "en-US" : "vi-VN";
}
