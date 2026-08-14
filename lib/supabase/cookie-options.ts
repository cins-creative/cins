import type { CookieOptions } from "@supabase/ssr";

/** Khớp `@supabase/ssr` DEFAULT — 400 ngày. Safari cần Max-Age + Expires, không phải session cookie. */
export const SUPABASE_SESSION_MAX_AGE_SEC = 400 * 24 * 60 * 60;

/**
 * Cookie options dùng chung cho browser + server Supabase clients.
 * `secure: false` trên dev để PKCE verifier không bị browser chặn trên http://localhost.
 */
export function getSupabaseCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    sameSite: "lax",
    secure: isProd,
    maxAge: SUPABASE_SESSION_MAX_AGE_SEC,
    expires: new Date(Date.now() + SUPABASE_SESSION_MAX_AGE_SEC * 1000),
  };
}
