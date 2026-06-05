import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { getNganhDetailBySlug, type NganhDetailBundle } from "@/lib/nganh/queries";
import { parseMetaNganhFields } from "@/lib/nganh/media-fields";
import type { MetaNganhDaoTao } from "@/lib/articles/types";

const NGANH_META_SELECT =
  "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, meta, loai_bai_viet, trang_thai_noi_dung";

export type NganhArticleMeta = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  tom_tat: string | null;
  meta: MetaNganhDaoTao | null;
  loai_bai_viet: string;
  trang_thai_noi_dung: string;
};

/** Metadata nhẹ — không tải `noi_dung` / quan hệ chi tiết. */
export async function getNganhMetaBySlug(
  slug: string,
): Promise<NganhArticleMeta | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(NGANH_META_SELECT)
      .eq("slug", slug)
      .eq("loai_bai_viet", "nganh_dao_tao")
      .eq("trang_thai_noi_dung", "published")
      .maybeSingle();
    if (error || !data) return null;
    const r = data as Record<string, unknown>;
    return {
      id: String(r.id),
      slug: String(r.slug ?? ""),
      tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
      tieu_de_viet:
        r.tieu_de_viet == null ? null : String(r.tieu_de_viet).trim() || null,
      tieu_de_eng:
        r.tieu_de_eng == null ? null : String(r.tieu_de_eng).trim() || null,
      tom_tat: (r.tom_tat as string | null) ?? null,
      meta: parseMetaNganhFields(r.meta),
      loai_bai_viet: String(r.loai_bai_viet ?? ""),
      trang_thai_noi_dung: String(r.trang_thai_noi_dung ?? ""),
    };
  } catch {
    return null;
  }
}

export const getNganhMetaBySlugCached = cache(getNganhMetaBySlug);

/** Dedup fetch giữa `generateMetadata` và page trong cùng request. */
export const getNganhDetailBySlugCached = cache(
  async (slug: string): Promise<NganhDetailBundle | null> =>
    getNganhDetailBySlug(slug),
);
