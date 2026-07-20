import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import type { ArticleBaiViet } from "@/lib/articles/types";
import { getNgheArticleBySlug } from "@/lib/articles/queries";

const NGHE_META_SELECT =
  "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, meta_title, meta_description, tom_tat, loai_bai_viet, trang_thai_noi_dung, merged_vao_id";

export type NgheArticleMeta = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tom_tat: string | null;
  loai_bai_viet: string;
  trang_thai_noi_dung: string;
  merged_vao_id: string | null;
};

function mapNgheMetaRow(r: Record<string, unknown>): NgheArticleMeta {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
    tieu_de_viet:
      r.tieu_de_viet == null ? null : String(r.tieu_de_viet).trim() || null,
    tieu_de_eng:
      r.tieu_de_eng == null ? null : String(r.tieu_de_eng).trim() || null,
    meta_title: (r.meta_title as string | null) ?? null,
    meta_description: (r.meta_description as string | null) ?? null,
    tom_tat: (r.tom_tat as string | null) ?? null,
    loai_bai_viet: String(r.loai_bai_viet ?? ""),
    trang_thai_noi_dung: String(r.trang_thai_noi_dung ?? ""),
    merged_vao_id:
      r.merged_vao_id == null ? null : String(r.merged_vao_id).trim() || null,
  };
}

/**
 * Metadata nhẹ — không tải `noi_dung`.
 * Gồm cả `published` và `merged` để gate 308 redirect slug cũ.
 */
export async function getNgheArticleMetaBySlug(
  slug: string,
): Promise<NgheArticleMeta | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(NGHE_META_SELECT)
      .eq("slug", slug)
      .eq("loai_bai_viet", "nghe")
      .in("trang_thai_noi_dung", ["published", "merged"])
      .maybeSingle();
    if (error || !data) return null;
    return mapNgheMetaRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Dedup fetch giữa `generateMetadata` và page trong cùng request. */
export const getNgheArticleBySlugCached = cache(
  async (slug: string): Promise<ArticleBaiViet | null> => getNgheArticleBySlug(slug),
);

/** Chỉ slug đích khi bài bị merge — không `select('*')`. */
export async function getArticleSlugById(id: string): Promise<string | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const slug = String((data as { slug?: string }).slug ?? "").trim();
    return slug || null;
  } catch {
    return null;
  }
}
