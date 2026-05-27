"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Client Supabase cho Client Components — đọc/ghi session cookie qua `@supabase/ssr`,
 * khớp với server client trong `lib/supabase/server.ts` để middleware/route đọc được session.
 */
export function createSupabaseBrowserClient() {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
  });
}
