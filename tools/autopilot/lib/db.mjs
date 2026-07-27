import { createClient } from "@supabase/supabase-js";

import { layServiceRoleKey, laySupabaseUrl } from "./env.mjs";

/** Client service role — chỉ dùng trong CLI/worker Autopilot. */
export function taoClientAutopilot() {
  return createClient(laySupabaseUrl(), layServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
