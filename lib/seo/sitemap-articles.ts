import { articlePublicHref } from "@/lib/articles/article-href";
import type { LoaiBaiViet } from "@/lib/articles/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export type SitemapArticleEntry = {
  path: string;
  lastModified: Date;
};

const PAGE_SIZE = 1000;

/**
 * Mọi bài `published` → URL canonical qua `articlePublicHref`.
 * Phân trang để tránh giới hạn PostgREST.
 */
export async function listPublishedArticlesForSitemap(): Promise<
  SitemapArticleEntry[]
> {
  if (!hasSupabaseEnv()) return [];

  const supabase = createPublicSupabaseClient();
  const out: SitemapArticleEntry[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select("slug, loai_bai_viet, cap_nhat_luc")
      .eq("trang_thai_noi_dung", "published")
      .order("cap_nhat_luc", { ascending: false })
      .range(from, to);

    if (error || !data?.length) break;

    for (const row of data) {
      const slug = String(row.slug ?? "").trim();
      const loai = String(row.loai_bai_viet ?? "").trim() as LoaiBaiViet;
      if (!slug || !loai) continue;
      // `linh_vuc` chưa có surface public riêng — bỏ khỏi sitemap.
      if (loai === "linh_vuc") continue;

      const path = articlePublicHref(loai, slug);
      const capNhat = row.cap_nhat_luc
        ? new Date(String(row.cap_nhat_luc))
        : new Date();
      out.push({
        path,
        lastModified: Number.isNaN(capNhat.getTime()) ? new Date() : capNhat,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}
