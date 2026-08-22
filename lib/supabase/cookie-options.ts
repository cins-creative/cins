import type { CookieOptions } from "@supabase/ssr";

import { isCinsApexFamily } from "@/lib/cins/manage-site";

/** Khớp `@supabase/ssr` DEFAULT — 400 ngày. Safari cần Max-Age + Expires, không phải session cookie. */
export const SUPABASE_SESSION_MAX_AGE_SEC = 400 * 24 * 60 * 60;

/**
 * Prod trên họ cins.vn: cookie `Domain=.cins.vn` để `cins.vn` và
 * `manage.cins.vn` chung phiên. Dev / workers.dev: host-only.
 */
export function getSupabaseCookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return ".cins.vn";
  try {
    const host = new URL(raw).hostname;
    return isCinsApexFamily(host) ? ".cins.vn" : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cookie options dùng chung cho browser + server Supabase clients.
 * `secure: false` trên dev để PKCE verifier không bị browser chặn trên http://localhost.
 */
export function getSupabaseCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  const domain = getSupabaseCookieDomain();
  return {
    path: "/",
    sameSite: "lax",
    secure: isProd,
    maxAge: SUPABASE_SESSION_MAX_AGE_SEC,
    expires: new Date(Date.now() + SUPABASE_SESSION_MAX_AGE_SEC * 1000),
    ...(domain ? { domain } : {}),
  };
}
