import type {
  ArticleBaiViet,
  ArticleCard,
  TacPhamGalleryItem,
  TruongNganhRow,
} from "@/lib/articles/types";
import type { RelatedJobLienQuanRow } from "@/lib/articles/related-jobs-dynamic";
import { ArticleContent } from "@/components/article/ArticleContent";
import { ArticleHeroV2 } from "@/components/article/ArticleHeroV2";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { InlineArticleDraftBar } from "@/components/article/InlineArticleDraftBar";
import { ArticleNgheView } from "@/components/article/nghe/ArticleNgheView";
import { ArticleSidebar } from "@/components/article/ArticleSidebar";
import { TacPhamSection } from "@/components/article/TacPhamSection";
import { TruongDaoTaoSection } from "@/components/article/TruongDaoTaoSection";

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
  tacPham: TacPhamGalleryItem[];
  truongRows: TruongNganhRow[];
  relatedJobsLienQuan?: RelatedJobLienQuanRow[];
  /** Hiện nút sửa + form khi dev hoặc CINS_INLINE_ARTICLE_EDIT (không cần service role). */
  draftUiEnabled?: boolean;
  /** Cho phép lưu Supabase — cần SUPABASE_SERVICE_ROLE_KEY. */
  draftPersistEnabled?: boolean;
};

export function ArticlePageView({
  article,
  lienQuan,
  tacPham,
  truongRows,
  relatedJobsLienQuan = [],
  draftUiEnabled = false,
  draftPersistEnabled = false,
}: Props) {
  const slugPath = `/bai-viet/${article.slug}`;
  const markdown =
    article.noi_dung?.trim() ||
    article.noi_dung_markdown?.trim() ||
    "";

  if (article.loai_bai_viet === "nghe") {
    return (
      <ArticleNgheView
        article={article}
        lienQuan={lienQuan}
        relatedJobsLienQuan={relatedJobsLienQuan}
        showDraftBar={draftUiEnabled}
        draftPersistEnabled={draftPersistEnabled}
      />
    );
  }

  return (
    <div className="article-page arv2">
      <ArticleJsonLd article={article} slugPath={slugPath} />
      <div className="article-wrap">
        <div className="article-grid">
          <main className="article-main">
            <ArticleHeroV2 article={article} truongRows={truongRows} />
            <ArticleContent markdown={markdown} />
            {article.loai_bai_viet === "nganh_dao_tao" ? (
              <TruongDaoTaoSection rows={truongRows} />
            ) : null}
            <TacPhamSection items={tacPham} />
          </main>
          <ArticleSidebar lienQuan={lienQuan} />
        </div>
      </div>
      {draftUiEnabled ? (
        <InlineArticleDraftBar
          key={`${article.id}-${article.cap_nhat_luc}`}
          article={article}
          persistEnabled={draftPersistEnabled}
        />
      ) : null}
    </div>
  );
}
