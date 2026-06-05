import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Supabase client cho Route Handlers (vd. `/auth/callback`):
 * - Đọc cookie từ **request** (gồm PKCE code_verifier browser đã ghi).
 * - Ghi session cookie lên **response** redirect (tránh mất cookie sau exchange).
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

/** Copy Set-Cookie đầy đủ (maxAge, httpOnly, secure…) sang response redirect. */
export function appendSetCookieHeaders(
  from: NextResponse,
  to: NextResponse,
): void {
  for (const header of from.headers.getSetCookie()) {
    to.headers.append("Set-Cookie", header);
  }
}

/** @deprecated Dùng `appendSetCookieHeaders` — `getAll()` không giữ cookie options. */
export function copySupabaseCookies(
  from: NextResponse,
  to: NextResponse,
): void {
  appendSetCookieHeaders(from, to);
}
