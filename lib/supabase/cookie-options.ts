import type { CookieOptions } from "@supabase/ssr";

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
  };
}
