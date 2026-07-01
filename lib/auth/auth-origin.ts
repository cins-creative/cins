/**
 * Origin cố định cho OAuth redirect — tránh lẫn localhost / 127.0.0.1 / LAN IP
 * khiến cookie PKCE không khớp lúc callback.
 *
 * Cấu hình `.env.local`:
 *   NEXT_PUBLIC_SITE_URL=http://localhost:3001
 *
 * Supabase Dashboard → Redirect URLs:
 *   http://localhost:3001/auth/callback
 *   (hoặc http://localhost:3001/**)
 */

export function normalizeSiteHostname(hostname: string): string {
  const h = hostname.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

/** Hai hostname cùng site (chỉ khác prefix `www.`). */
export function siteHostnamesEquivalent(a: string, b: string): boolean {
  return normalizeSiteHostname(a) === normalizeSiteHostname(b);
}

/** Host dev/preview — không ép redirect canonical. */
export function isLikelyLocalOrPreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".vercel.app") ||
    h.endsWith(".workers.dev") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h)
  );
}

export function getConfiguredSiteUrl(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function getConfiguredSiteOrigin(): string | null {
  return getConfiguredSiteUrl()?.origin ?? null;
}

/** Origin dùng cho `redirectTo` OAuth — luôn khớp tab browser (PKCE cookie). */
export function resolveAuthOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getConfiguredSiteOrigin() ?? "";
}

/**
 * Trả về thông báo lỗi nếu user đang ở origin dev khác cấu hình (cookie PKCE sẽ lệch).
 * Chỉ khác prefix `www.` được coi là cùng site — không chặn.
 *
 * Không chặn production (cins.vn) khi env build còn `localhost` — OAuth client dùng
 * `resolveAuthOrigin()` = `window.location.origin` nên PKCE vẫn đúng.
 */
export function authOriginMismatchMessage(): string | null {
  if (typeof window === "undefined") return null;
  const configured = getConfiguredSiteOrigin();
  if (!configured) return null;

  const current = window.location.origin;
  if (current === configured) return null;

  try {
    const currentHost = new URL(current).hostname;
    const configuredHost = new URL(configured).hostname;
    if (siteHostnamesEquivalent(currentHost, configuredHost)) return null;

    const currentIsDev = isLikelyLocalOrPreviewHost(currentHost);
    const configuredIsDev = isLikelyLocalOrPreviewHost(configuredHost);
    if (!currentIsDev || !configuredIsDev) return null;
  } catch {
    return null;
  }

  return (
    `Bạn đang mở ${current} nhưng site cấu hình ${configured}. ` +
    `Hãy mở ${configured}/login để đăng nhập (tránh 127.0.0.1 hoặc IP LAN nếu env dùng localhost).`
  );
}

/**
 * Redirect `www.` ↔ apex về hostname trong `NEXT_PUBLIC_SITE_URL` (308).
 * Chỉ áp dụng production domain — bỏ qua localhost / preview.
 */
export function buildCanonicalHostRedirect(
  requestUrl: URL,
): { url: URL; status: 308 } | null {
  const configured = getConfiguredSiteUrl();
  if (!configured) return null;

  const requestHost = requestUrl.hostname.toLowerCase();
  const canonicalHost = configured.hostname.toLowerCase();

  if (isLikelyLocalOrPreviewHost(requestHost)) return null;
  if (!siteHostnamesEquivalent(requestHost, canonicalHost)) return null;
  if (requestHost === canonicalHost) return null;

  const url = new URL(requestUrl.toString());
  url.hostname = canonicalHost;
  url.protocol = configured.protocol;
  return { url, status: 308 };
}
