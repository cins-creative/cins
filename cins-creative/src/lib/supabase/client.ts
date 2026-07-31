import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy từ .env.example",
    );
  }
  return createBrowserClient<Database>(url, key);
}
