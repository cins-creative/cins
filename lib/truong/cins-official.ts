/**
 * Tài khoản CINs Official — CTA bàn giao trang trường seed / nhắn tin.
 *
 * Override bằng env build nếu đổi tài khoản:
 * - `NEXT_PUBLIC_CINS_OFFICIAL_SLUG`
 * - `NEXT_PUBLIC_CINS_OFFICIAL_USER_ID`
 *
 * Fallback khớp `CINS_SYSTEM_USER_ID` / user `cins_official` trên production CINS.
 */
export const CINS_OFFICIAL_SLUG_DEFAULT = "cins_official";
export const CINS_OFFICIAL_USER_ID_DEFAULT =
  "aecd2e08-60dd-4752-8178-dcb5a5371b03";
export const CINS_OFFICIAL_DISPLAY_NAME = "CINs_Official";

export function getCinsOfficialSlug(): string {
  return (
    process.env.NEXT_PUBLIC_CINS_OFFICIAL_SLUG?.trim() ||
    CINS_OFFICIAL_SLUG_DEFAULT
  );
}

export function getCinsOfficialUserId(): string {
  return (
    process.env.NEXT_PUBLIC_CINS_OFFICIAL_USER_ID?.trim() ||
    CINS_OFFICIAL_USER_ID_DEFAULT
  );
}

export function getCinsOfficialJourneyHref(): string {
  return `/${encodeURIComponent(getCinsOfficialSlug())}`;
}
