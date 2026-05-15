import Link from "next/link";

import { NgheRelItem } from "@/components/article/nghe/NgheRelParts";
import type { ArticleCard } from "@/lib/articles/types";
import { partitionNgheRelated } from "@/lib/articles/rel-visual";

export function ArticleNgheSidebar({
  lienQuan,
  articleTitle,
}: {
  lienQuan: ArticleCard[];
  articleTitle: string;
}) {
  const { keywords, nghe, nganh } = partitionNgheRelated(lienQuan);

  return (
    <aside className="article-side" aria-label="Liên quan">
      <div className="side-card">
        <div className="rel-header">
          <h4>
            Keyword liên quan
            <em>
              {keywords.length ? `${keywords.length} kỹ thuật` : "Chưa có"}
            </em>
          </h4>
          {keywords.length > 0 ? (
            <span className="hint">Hover để xem mô tả</span>
          ) : null}
        </div>
        {keywords.length > 0 ? (
          <div className="rel-list">
            {keywords.map((card) => (
              <NgheRelItem key={card.id} card={card} tipClass="tip-left" />
            ))}
          </div>
        ) : (
          <p className="nghe-side-empty">
            Chưa gắn keyword — thêm liên kết trong admin.
          </p>
        )}
      </div>

      <div className="side-card">
        <div className="rel-header">
          <h4>
            Nghề liên quan
            <em>{nghe.length ? "cùng pipeline" : "Chưa có"}</em>
          </h4>
          {nghe.length > 0 ? (
            <span className="hint">Hover để xem thu nhập &amp; mảng việc</span>
          ) : null}
        </div>
        {nghe.length > 0 ? (
          <div className="rel-list">
            {nghe.map((card) => (
              <NgheRelItem key={card.id} card={card} tipClass="tip-left" />
            ))}
          </div>
        ) : (
          <p className="nghe-side-empty">Chưa có nghề liên quan.</p>
        )}
      </div>

      <div className="side-card">
        <div className="rel-header">
          <h4>
            Ngành học vào nghề
            <em>
              {nganh.length ? `${nganh.length} ngành ĐT` : "Chưa có"}
            </em>
          </h4>
          {nganh.length > 0 ? (
            <span className="hint">Hover để xem mã ngành &amp; thời gian</span>
          ) : null}
        </div>
        {nganh.length > 0 ? (
          <div className="rel-list">
            {nganh.map((card) => (
              <NgheRelItem key={card.id} card={card} tipClass="tip-left" />
            ))}
          </div>
        ) : (
          <p className="nghe-side-empty">Chưa có ngành đào tạo liên quan.</p>
        )}
      </div>

      <div className="side-card side-card-quiz">
        <h4 className="side-card-quiz-title">
          Bạn phù hợp với nghề này?
        </h4>
        <p className="side-card-quiz-text">
          Làm bài quiz 3 phút để biết tỷ lệ phù hợp của bạn với{" "}
          {articleTitle}.
        </p>
        <Link href="/" className="tb-cta nghe-quiz-cta">
          Làm quiz miễn phí →
        </Link>
      </div>
    </aside>
  );
}
