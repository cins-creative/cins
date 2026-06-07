import "server-only";

import { slugifyOrgName } from "@/lib/cong-dong/org-slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export function slugifyFilterName(value: string): string {
  return slugifyOrgName(value).slice(0, 48) || "nhan";
}

export async function uniqueFilterSlugForUser(
  userId: string,
  baseSlug: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  let candidate = baseSlug.slice(0, 48);
  let n = 2;
  while (n < 100) {
    const { data } = await admin
      .from("filter_nhan")
      .select("id")
      .eq("id_nguoi_dung", userId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate = baseSlug.slice(0, 48 - suffix.length) + suffix;
    n += 1;
  }
  return `${baseSlug.slice(0, 40)}-${Date.now().toString(36)}`;
}
