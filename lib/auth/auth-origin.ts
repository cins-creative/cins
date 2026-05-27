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

export function getConfiguredSiteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Origin dùng cho `redirectTo` — ưu tiên env, fallback `window.location.origin`. */
export function resolveAuthOrigin(): string {
  if (typeof window === "undefined") {
    return getConfiguredSiteOrigin() ?? "";
  }
  const configured = getConfiguredSiteOrigin();
  if (configured) return configured;
  return window.location.origin;
}

/**
 * Trả về thông báo lỗi nếu user đang ở origin khác cấu hình (cookie PKCE sẽ lệch).
 */
export function authOriginMismatchMessage(): string | null {
  if (typeof window === "undefined") return null;
  const configured = getConfiguredSiteOrigin();
  if (!configured) return null;
  if (window.location.origin === configured) return null;
  return (
    `Bạn đang mở ${window.location.origin} nhưng site cấu hình ${configured}. ` +
    `Hãy mở ${configured}/login để đăng nhập (tránh 127.0.0.1 hoặc IP LAN nếu env dùng localhost).`
  );
}
