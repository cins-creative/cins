import "server-only";

import { slugifyNganhTitle } from "@/lib/nganh/hub-slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function uniqueTagArticleSlug(ten: string): Promise<string> {
  const base = slugifyNganhTitle(ten) || "tag";
  const admin = createServiceRoleClient();

  let candidate = base;
  let n = 2;
  while (n < 100) {
    const { data, error } = await admin
      .from("article_bai_viet")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return candidate;
    candidate = `${base.slice(0, 72)}-${n}`;
    n += 1;
  }
  return `${base.slice(0, 64)}-${Date.now().toString(36)}`;
}
