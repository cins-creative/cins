import { CINS_LOCALE_COOKIE, type CinsLocale } from "@/lib/locale/types";

/** Ghi cookie locale do user chọn — IP không được ghi đè sau bước này. */
export function persistCinsLocale(locale: CinsLocale): void {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${CINS_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
