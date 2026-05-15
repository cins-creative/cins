import type { ArticleBaiViet, ArticleCard, TacPhamGalleryItem, TruongNganhRow } from "@/lib/articles/types";
import { ArticleContent } from "@/components/article/ArticleContent";
import { ArticleHeroV2 } from "@/components/article/ArticleHeroV2";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { ArticleNgheView } from "@/components/article/nghe/ArticleNgheView";
import { ArticleSidebar } from "@/components/article/ArticleSidebar";
import { TacPhamSection } from "@/components/article/TacPhamSection";
import { TruongDaoTaoSection } from "@/components/article/TruongDaoTaoSection";

type Props = {
  article: ArticleBaiViet;
  lienQuan: ArticleCard[];
  tacPham: TacPhamGalleryItem[];
  truongRows: TruongNganhRow[];
};

export function ArticlePageView({
  article,
  lienQuan,
  tacPham,
  truongRows,
}: Props) {
  const slugPath = `/bai-viet/${article.slug}`;
  const markdown =
    article.noi_dung?.trim() ||
    article.noi_dung_markdown?.trim() ||
    "";

  if (article.loai_bai_viet === "nghe") {
    return <ArticleNgheView article={article} />;
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
    </div>
  );
}
