import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getTrimmedSupabaseAnonKey,
  getTrimmedSupabaseUrl,
} from "@/lib/supabase/env";

export { hasSupabaseEnv } from "@/lib/supabase/env";

export async function createClient() {
  const url = getTrimmedSupabaseUrl();
  const key = getTrimmedSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or anon key (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL / SUPABASE_ANON_KEY)",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch (error) {
          /* RSC thường không ghi được cookie — middleware /login phải sync trước.
           * Log tên cookie để phát hiện sớm nếu còn path RSC nào refresh hụt. */
          const names = cookiesToSet.map((c) => c.name).join(", ");
          console.warn(
            `[supabase] setAll cookies failed (RSC/context?): [${names}]`,
            error,
          );
        }
      },
    },
  });
}
