/** Ẩn ghim nợ phí trên Journey cá nhân — cookie theo user, không ALTER. */

export const BILLING_JOURNEY_PIN_HIDE_COOKIE = "cins-billing-pin-hide";
/** 10 năm — «Không hiển thị lại». */
export const BILLING_JOURNEY_PIN_HIDE_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 10;
const HIDE_IDS_MAX = 20;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseBillingPinHideCookie(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    return decodeURIComponent(raw)
      .split(",")
      .map((s) => s.trim())
      .filter((id) => UUID_RE.test(id));
  } catch {
    return [];
  }
}

export function isBillingJourneyPinHidden(
  raw: string | undefined,
  userId: string,
): boolean {
  if (!userId) return false;
  return parseBillingPinHideCookie(raw).includes(userId);
}

function readDocumentCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

export function readBillingPinHideCookieFromDocument(): string | undefined {
  return readDocumentCookie(BILLING_JOURNEY_PIN_HIDE_COOKIE);
}

/** Client: ghi userId vào cookie để server không render ghim nữa. */
export function writeBillingJourneyPinHideCookie(userId: string): void {
  if (typeof document === "undefined" || !UUID_RE.test(userId)) return;
  const existing = parseBillingPinHideCookie(
    readDocumentCookie(BILLING_JOURNEY_PIN_HIDE_COOKIE),
  );
  const merged = [userId, ...existing.filter((id) => id !== userId)].slice(
    0,
    HIDE_IDS_MAX,
  );
  const secure = window.location.protocol === "https:";
  document.cookie = [
    `${BILLING_JOURNEY_PIN_HIDE_COOKIE}=${encodeURIComponent(merged.join(","))}`,
    "Path=/",
    `Max-Age=${BILLING_JOURNEY_PIN_HIDE_MAX_AGE_SEC}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
