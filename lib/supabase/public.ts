import { createClient } from "@supabase/supabase-js";

import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Client chỉ dùng anon key, không đọc/ghi cookie — phù hợp truy vấn public (article list, …)
 * trên Server Components, tránh đường đi phức tạp của @supabase/ssr khi không cần session.
 */
export function createPublicSupabaseClient() {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
