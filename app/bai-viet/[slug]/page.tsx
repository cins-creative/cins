import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ArticlePageView } from "@/components/article/ArticlePageView";
import { BaiVietArticleView } from "@/components/bai-viet/BaiVietArticleView";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  fetchBlogExploreLinks,
  fetchBlogNhomForArticle,
  fetchBlogRelatedArticles,
} from "@/lib/bai-viet/queries";
import {
  fetchRelatedArticles,
  fetchTruongDaoTaoForNganh,
  fetchTacPhamGalleryForArticle,
  getArticleById,
  getArticleBySlug,
} from "@/lib/articles/queries";
import "@/app/cins-bai-viet-detail.css";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import type { ArticleBaiViet, LoaiBaiViet } from "@/lib/articles/types";
import { ngheNghiepDetailHref } from "@/lib/cins/hubPaths";
import {
  fetchEntityMilestones,
  fetchEntityTaggedUsers,
} from "@/lib/tag/entity-milestones-fetch";

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

  if (article.loai_bai_viet === "keyword") {
    permanentRedirect(`/keyword/${encodeURIComponent(article.slug)}`);
  }

  if (article.loai_bai_viet === "phan_mem") {
    permanentRedirect(`/software/${encodeURIComponent(article.slug)}`);
  }

  if (article.loai_bai_viet === "nghe") {
    permanentRedirect(ngheNghiepDetailHref(article.slug));
  }

  const draftUiEnabled = isInlineArticleEditEnabled();
  const draftPersistEnabled = hasServiceRoleEnv();

  if (article.loai_bai_viet === "blog") {
    const [nhom, related, explore] = await Promise.all([
      fetchBlogNhomForArticle(article),
      fetchBlogRelatedArticles(article.id),
      fetchBlogExploreLinks(article.id),
    ]);

    return (
      <CinsShell data-screen-label={`Bai-viet-${slug}`}>
        <BaiVietArticleView
          article={article}
          nhom={nhom}
          related={related}
          explore={explore}
          draftUiEnabled={draftUiEnabled}
          draftPersistEnabled={draftPersistEnabled}
        />
        <SiteFooter />
      </CinsShell>
    );
  }

  const [lienQuan, tacPham, truongRows] = await Promise.all([
    fetchRelatedArticles(article.id),
    fetchTacPhamGalleryForArticle(article.id),
    article.loai_bai_viet === "nganh_dao_tao"
      ? fetchTruongDaoTaoForNganh(article.id)
      : Promise.resolve([]),
  ]);

  const session = await getCurrentSessionAndProfile();
  const viewerProfileId = session?.profile?.id ?? null;
  const sort = "moi_nhat" as const;

  let entityTaggedUsers: Awaited<ReturnType<typeof fetchEntityTaggedUsers>> = [];
  let entityMilestones: Awaited<ReturnType<typeof fetchEntityMilestones>> = [];
  if (article.loai_bai_viet === "mon_hoc") {
    [entityTaggedUsers, entityMilestones] = await Promise.all([
      fetchEntityTaggedUsers(article.id),
      fetchEntityMilestones(article.id, sort, viewerProfileId),
    ]);
  }

  return (
    <CinsShell data-screen-label={`Bai-viet-${slug}`}>
      <ArticlePageView
        article={article}
        lienQuan={lienQuan}
        tacPham={tacPham}
        truongRows={truongRows}
        entityTaggedUsers={entityTaggedUsers}
        entityMilestones={entityMilestones}
        entitySort={sort}
        viewerProfileId={viewerProfileId}
        draftUiEnabled={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
      <SiteFooter />
    </CinsShell>
  );
}
