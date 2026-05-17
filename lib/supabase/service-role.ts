import { createClient } from "@supabase/supabase-js";

import { getTrimmedSupabaseUrl } from "@/lib/supabase/env";

/** Chỉ gọi từ server (API route / server action). Không import vào client bundle. */
export function hasServiceRoleEnv(): boolean {
  const url = getTrimmedSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!(url && key);
}

export function createServiceRoleClient() {
  const url = getTrimmedSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase project URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
