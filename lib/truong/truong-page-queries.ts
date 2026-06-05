import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const TRUONG_META_SELECT = "id, slug, ten, mo_ta";

export type TruongPageMeta = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
};

/** Metadata nhẹ — không tải programs / baidang / cấu hình thi. */
export async function getTruongMetaBySlug(
  slug: string,
): Promise<TruongPageMeta | null> {
  if (!hasSupabaseEnv()) return null;
  const slugNorm = slug.trim();
  if (!slugNorm) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_to_chuc")
      .select(TRUONG_META_SELECT)
      .eq("slug", slugNorm)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as Record<string, unknown>;
    const ten = String(r.ten ?? "").trim();
    if (!ten) return null;
    return {
      id: String(r.id),
      slug: String(r.slug ?? slugNorm).trim() || slugNorm,
      ten,
      mo_ta: r.mo_ta == null ? null : String(r.mo_ta).trim() || null,
    };
  } catch {
    return null;
  }
}

export const getTruongMetaBySlugCached = cache(getTruongMetaBySlug);
