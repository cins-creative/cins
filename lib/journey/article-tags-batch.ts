import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArticleTagRef } from "@/lib/editor/article-tag";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ fetchArticleTagsForTacPham                                       ║
   ║                                                                  ║
   ║ Batch-fetch article tags (`article_gan_tac_pham` → embed         ║
   ║ `article_bai_viet`) cho một list `id_tac_pham`. Trả Map gom theo ║
   ║ tác phẩm để consumer tra cứu O(1).                                ║
   ║                                                                  ║
   ║ Dùng chung bởi `loadMilestoneDetail` (detail view của bài viết)  ║
   ║ và `fetchMilestonesForUser` (timeline card) → tránh N+1 query.   ║
   ║                                                                  ║
   ║ Không lọc trang_thai_noi_dung ở đây — caller có thể muốn render  ║
   ║ tag dù bài viết đã unpublish (vẫn cần show ngữ cảnh). Có thể     ║
   ║ thêm filter sau nếu cần.                                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type GanRow = {
  id_tac_pham: string;
  article_bai_viet: {
    id?: string | null;
    slug?: string | null;
    tieu_de?: string | null;
    loai_bai_viet?: string | null;
  } | null;
};

export async function fetchArticleTagsForTacPham(
  admin: SupabaseClient,
  tacPhamIds: ReadonlyArray<string>,
): Promise<Map<string, ArticleTagRef[]>> {
  const out = new Map<string, ArticleTagRef[]>();
  if (tacPhamIds.length === 0) return out;

  const { data } = await admin
    .from("article_gan_tac_pham")
    .select(
      "id_tac_pham, article_bai_viet ( id, slug, tieu_de, loai_bai_viet )",
    )
    .in("id_tac_pham", tacPhamIds as string[])
    .returns<GanRow[]>();

  for (const row of data ?? []) {
    const a = row.article_bai_viet;
    if (!a?.id || !a.slug) continue;
    const tag: ArticleTagRef = {
      id: String(a.id),
      slug: String(a.slug),
      tieu_de: String(a.tieu_de ?? "").trim() || "Không tiêu đề",
      loai_bai_viet: String(a.loai_bai_viet ?? "").trim() || "blog",
    };
    const arr = out.get(row.id_tac_pham);
    if (arr) arr.push(tag);
    else out.set(row.id_tac_pham, [tag]);
  }
  return out;
}
