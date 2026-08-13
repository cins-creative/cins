import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Lấy access token từ `Authorization: Bearer <jwt>`.
 * Không log giá trị. Cron secret cũng đi header này — caller phải phân nhánh
 * (JWT user vs secret nội bộ) trước khi gọi `getUser`.
 */
export function parseBearerAccessToken(
  authorization: string | null | undefined,
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(\S+)/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token || null;
}

/**
 * Access token user Supabase là JWT 3 phần. Secret nội bộ (upload inline,
 * cron) cũng đi `Authorization: Bearer` nhưng không phải JWT — không gọi
 * `auth.getUser` với chúng (sẽ fail rồi nuốt cookie session).
 */
export function looksLikeSupabaseUserJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Client anon + JWT user — không cookie, không refresh, không persist.
 * Dùng cho app native. RLS thấy `auth.uid()` từ token.
 */
export function createBearerSupabaseClient(
  accessToken: string,
): SupabaseClient {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
