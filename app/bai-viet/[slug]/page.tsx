import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ArticlePageView } from "@/components/article/ArticlePageView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import {
  fetchRelatedArticles,
  fetchRelatedJobsLienQuan,
  fetchTruongDaoTaoForNganh,
  fetchTacPhamGalleryForArticle,
  getArticleById,
  getArticleBySlug,
} from "@/lib/articles/queries";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import type { ArticleBaiViet, LoaiBaiViet } from "@/lib/articles/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function coerceLoai(raw: string | undefined): LoaiBaiViet {
  const allowed: LoaiBaiViet[] = [
    "linh_vuc",
    "nghe",
    "keyword",
    "phan_mem",
    "mon_hoc",
    "blog",
    "event",
    "nganh_dao_tao",
  ];
  return (allowed.includes(raw as LoaiBaiViet) ? raw : "blog") as LoaiBaiViet;
}

function normalizeArticle(article: ArticleBaiViet): ArticleBaiViet {
  return {
    ...article,
    loai_bai_viet: coerceLoai(article.loai_bai_viet as string),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return { title: "Bài viết | CINs" };
  }
  const raw = await getArticleBySlug(slug);
  if (!raw) return { title: "Bài viết | CINs" };
  const article = normalizeArticle(raw);
  if (article.trang_thai_noi_dung !== "published") {
    return { title: "Bài viết | CINs" };
  }
  const title =
    article.meta_title?.trim() ||
    `${article.tieu_de} | CINs`;
  const desc =
    article.meta_description?.trim() || article.tom_tat?.trim() || undefined;
  return { title, description: desc };
}

export default async function BaiVietSlugPage({ params }: Props) {
  const { slug } = await params;

  if (!hasSupabaseEnv()) {
    notFound();
  }

  const raw = await getArticleBySlug(slug);
  if (!raw) {
    notFound();
  }

  const article = normalizeArticle(raw);

  if (article.trang_thai_noi_dung === "merged" && article.merged_vao_id) {
    const target = await getArticleById(article.merged_vao_id);
    if (target?.slug) {
      permanentRedirect(`/bai-viet/${target.slug}`);
    }
    notFound();
  }

  if (article.trang_thai_noi_dung !== "published") {
    notFound();
  }

  const [lienQuan, tacPham, truongRows, relatedJobsLienQuan] =
    await Promise.all([
      fetchRelatedArticles(article.id),
      fetchTacPhamGalleryForArticle(article.id),
      article.loai_bai_viet === "nganh_dao_tao"
        ? fetchTruongDaoTaoForNganh(article.id)
        : Promise.resolve([]),
      article.loai_bai_viet === "nghe"
        ? fetchRelatedJobsLienQuan(article.id)
        : Promise.resolve([]),
    ]);

  const draftUiEnabled = isInlineArticleEditEnabled();
  const draftPersistEnabled = hasServiceRoleEnv();

  return (
    <CinsShell data-screen-label={`Bai-viet-${slug}`}>
      <ArticlePageView
        article={article}
        lienQuan={lienQuan}
        tacPham={tacPham}
        truongRows={truongRows}
        relatedJobsLienQuan={relatedJobsLienQuan}
        draftUiEnabled={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
      <SiteFooter />
    </CinsShell>
  );
}
