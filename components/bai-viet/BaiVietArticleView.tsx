import Link from "next/link";

import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import { BaiVietArticleBody } from "@/components/bai-viet/BaiVietArticleBody";
import { BaiVietArticleMetaCard } from "@/components/bai-viet/BaiVietArticleMetaCard";
import { BaiVietArticleSidebar } from "@/components/bai-viet/BaiVietArticleSidebar";
import { BaiVietRelatedArticles } from "@/components/bai-viet/BaiVietRelatedArticles";
import type { ArticleNhomEmbedRow } from "@/lib/bai-viet/nhom-embed";
import type { BlogExploreLink, BlogRelatedCard } from "@/lib/bai-viet/types";
import type { ArticleBaiViet } from "@/lib/articles/types";

type Props = {
  article: ArticleBaiViet;
  nhom: {
    article_nhom_all: ArticleNhomEmbedRow[] | null;
    bo_phan: ArticleNhomEmbedRow | null;
    cap_do: ArticleNhomEmbedRow | null;
  };
  related: BlogRelatedCard[];
  explore: BlogExploreLink[];
  draftUiEnabled?: boolean;
  draftPersistEnabled?: boolean;
};

export function BaiVietArticleView({
  article,
  nhom,
  related,
  explore,
  draftUiEnabled = false,
  draftPersistEnabled = false,
}: Props) {
  const slugPath = `/bai-viet/${article.slug}`;
  const body =
    article.noi_dung?.trim() || article.noi_dung_markdown?.trim() || "";
  const breadcrumbShort =
    article.tieu_de.length > 48
      ? `${article.tieu_de.slice(0, 48)}…`
      : article.tieu_de;

  const tagExplore = explore.slice(0, 12);

  return (
    <article className="bv-detail">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <div className="bv-detail__page">
        <header className="bv-detail-hero">
          <div>
            <nav className="bv-breadcrumb" aria-label="Breadcrumb">
              <span>Bài viết</span>
              {nhom.bo_phan ? (
                <>
                  <span className="bv-breadcrumb-sep" aria-hidden>
                    ›
                  </span>
                  <span>{nhom.bo_phan.ten}</span>
                </>
              ) : null}
              <span className="bv-breadcrumb-sep" aria-hidden>
                ›
              </span>
              <span>{breadcrumbShort}</span>
            </nav>

            {nhom.bo_phan ? (
              <p className="bv-detail-eyebrow">
                <span className="bv-detail-eyebrow-dot" aria-hidden />
                {nhom.bo_phan.ten}
              </p>
            ) : (
              <p className="bv-detail-eyebrow">
                <span className="bv-detail-eyebrow-dot" aria-hidden />
                Bài viết CINs
              </p>
            )}

            <h1 className="bv-detail-title">{article.tieu_de}</h1>
            {article.tieu_de_eng ? (
              <p className="bv-detail-subtitle">{article.tieu_de_eng}</p>
            ) : null}
            {article.tom_tat ? (
              <p className="bv-detail-lead">{article.tom_tat}</p>
            ) : null}
          </div>

          <BaiVietArticleMetaCard
            tieu_de={article.tieu_de}
            bo_phan={nhom.bo_phan}
            cap_do={nhom.cap_do}
            nhomAll={nhom.article_nhom_all}
            tao_luc={article.tao_luc}
            cap_nhat_luc={article.cap_nhat_luc}
            luot_xem={article.luot_xem}
            readSource={body}
          />
        </header>

        <div className="bv-detail-body">
          <div className="bv-detail-main">
            <BaiVietArticleBody htmlOrMarkdown={body} />

            {tagExplore.length > 0 ? (
              <div className="bv-detail-tags">
                <p className="bv-detail-tags-label">Tags</p>
                <div className="bv-detail-tags-pills">
                  {tagExplore.map((t) => (
                    <Link
                      key={`${t.loai_bai_viet}-${t.id}`}
                      href={`/bai-viet/${t.slug}`}
                      className="bv-detail-tag"
                    >
                      {t.tieu_de}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <BaiVietArticleSidebar related={related} explore={explore} />
        </div>

        <BaiVietRelatedArticles items={related} />
      </div>

      {draftUiEnabled ? (
        <InlineArticleDraftBar
          key={`${article.id}-${article.cap_nhat_luc}`}
          article={article}
          persistEnabled={draftPersistEnabled}
        />
      ) : null}
    </article>
  );
}
