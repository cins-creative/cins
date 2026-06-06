import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";

function requireSupabaseEnv(): { url: string; key: string } {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return { url, key };
}

/**
 * Supabase client cho Route Handlers thông thường — ghi cookie lên response đích.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, key } = requireSupabaseEnv();

  return createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headers) {
          for (const [header, value] of Object.entries(headers)) {
            response.headers.set(header, value);
          }
        }
      },
    },
  });
}

/**
 * OAuth callback — ghi cookie vào **cả** `cookies()` lẫn response redirect.
 * Next.js 15/16 không tự merge `cookies().set()` vào `NextResponse.redirect()`.
 */
export async function createSupabaseOAuthCallbackClient(
  request: NextRequest,
  redirectResponse: NextResponse,
): Promise<SupabaseClient> {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            /* Route Handler có thể từ chối ghi sau khi headers đã flush. */
          }
          redirectResponse.cookies.set(name, value, options);
        });
        if (headers) {
          for (const [header, value] of Object.entries(headers)) {
            redirectResponse.headers.set(header, value);
          }
        }
      },
    },
  });
}

/**
 * supabase-js >= 2.91 hoãn SIGNED_IN qua setTimeout(0); subscriber @supabase/ssr
 * ghi cookie trong handler đó — phải await trước khi return redirect.
 */
export async function flushDeferredAuthCookies(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Copy Set-Cookie đầy đủ (maxAge, httpOnly, secure…) sang response redirect. */
export function appendSetCookieHeaders(
  from: NextResponse,
  to: NextResponse,
): void {
  const headers =
    typeof from.headers.getSetCookie === "function"
      ? from.headers.getSetCookie()
      : [];

  if (headers.length > 0) {
    for (const header of headers) {
      to.headers.append("Set-Cookie", header);
    }
    return;
  }

  for (const { name, value } of from.cookies.getAll()) {
    to.cookies.set(name, value);
  }
}

/** @deprecated Dùng `appendSetCookieHeaders`. */
export function copySupabaseCookies(
  from: NextResponse,
  to: NextResponse,
): void {
  appendSetCookieHeaders(from, to);
}
