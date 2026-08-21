import { headers } from "next/headers";

import {
  CINS_LOCALE_HEADER,
  DEFAULT_LOCALE,
  normalizeLocale,
  type CinsLocale,
} from "./types";

/**
 * Locale đã phát hiện ở `middleware.ts` và forward qua header `x-cins-locale`.
 * Đọc trong Server Component / `generateMetadata` / route handler.
 *
 * Fallback `vi` khi không có header (vd. path bypass middleware).
 */
export async function getCinsLocale(): Promise<CinsLocale> {
  try {
    const store = await headers();
    return normalizeLocale(store.get(CINS_LOCALE_HEADER));
  } catch {
    return DEFAULT_LOCALE;
  }
}
