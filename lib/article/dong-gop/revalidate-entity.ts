import "server-only";

import { revalidatePath } from "next/cache";

import { articlePublicHref } from "@/lib/articles/article-href";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { fetchDongGopById } from "./fetch";

/** Revalidate trang entity công khai sau thay đổi bài chính / bản đóng góp. */
export async function revalidateEntityArticlePaths(idBaiViet: string) {
  const admin = createServiceRoleClient();
  const { data: article } = await admin
    .from("article_bai_viet")
    .select("slug, loai_bai_viet")
    .eq("id", idBaiViet)
    .maybeSingle<{ slug: string; loai_bai_viet: string }>();

  if (!article?.slug) return;

  const slug = encodeURIComponent(article.slug);
  revalidatePath(articlePublicHref(article.loai_bai_viet, article.slug));
  revalidatePath(`/bai-viet/${slug}`);
}

export async function revalidateAfterDongGopMutation(idDongGop: string) {
  revalidatePath("/admin/bai-viet");

  const row = await fetchDongGopById(idDongGop);
  if (!row) return;

  await revalidateEntityArticlePaths(row.id_bai_viet);
}
