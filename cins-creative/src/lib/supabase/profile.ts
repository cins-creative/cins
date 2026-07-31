import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

export type Profile = Database["public"]["Tables"]["user_nguoi_dung"]["Row"];

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_nguoi_dung")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data;
}

export function needsOnboarding(profile: Profile | null): boolean {
  if (!profile) return true;
  const slug = profile.slug?.trim() ?? "";
  const name = profile.ten_hien_thi?.trim() ?? "";
  if (!name) return true;
  // Auto slug from email local-part still needs a real chosen slug/name
  if (!slug || slug.includes("@")) return true;
  return false;
}
