import { nhomChipClass } from "@/lib/bai-viet/nhom-embed";
import type { ArticleNhomEmbedRow } from "@/lib/bai-viet/nhom-embed";
import {
  estimateReadMinutes,
  formatBlogDate,
  formatViewCount,
} from "@/lib/bai-viet/utils";

type Props = {
  tieu_de: string;
  bo_phan: ArticleNhomEmbedRow | null;
  cap_do: ArticleNhomEmbedRow | null;
  nhomAll: ArticleNhomEmbedRow[] | null;
  tao_luc: string;
  cap_nhat_luc: string;
  luot_xem: number;
  readSource: string | null;
};

export function BaiVietArticleMetaCard({
  tieu_de,
  bo_phan,
  cap_do,
  nhomAll,
  tao_luc,
  cap_nhat_luc,
  luot_xem,
  readSource,
}: Props) {
  const readMin = estimateReadMinutes(readSource);
  const updated =
    cap_nhat_luc && cap_nhat_luc !== tao_luc ? formatBlogDate(cap_nhat_luc) : null;

  const boPhanChips =
    nhomAll?.filter((n) => n.loai_nhom === "bo_phan") ?? (bo_phan ? [bo_phan] : []);

  return (
    <aside className="bv-meta-card" aria-label="Thông tin bài viết">
      <div className="bv-meta-card-head">
        <div>
          <p>Bài viết · CINs</p>
          <h3>{tieu_de}</h3>
        </div>
        <span className="bv-meta-badge">Blog</span>
      </div>
      <div className="bv-meta-rows">
        <div className="bv-meta-row">
          <span className="bv-meta-row-label">Chủ đề</span>
          <span className="bv-meta-row-value">
            <span className="bv-meta-chips">
              {boPhanChips.length ? (
                boPhanChips.map((n) => (
                  <span key={n.id} className={nhomChipClass(n.slug)}>
                    {n.ten}
                  </span>
                ))
              ) : (
                <span>—</span>
              )}
            </span>
          </span>
        </div>
        <div className="bv-meta-row">
          <span className="bv-meta-row-label">Cấp độ</span>
          <span className="bv-meta-row-value">
            {cap_do ? (
              <span className={nhomChipClass(cap_do.slug)}>{cap_do.ten}</span>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="bv-meta-row">
          <span className="bv-meta-row-label">Ngày đăng</span>
          <span className="bv-meta-row-value">{formatBlogDate(tao_luc)}</span>
        </div>
        {updated ? (
          <div className="bv-meta-row">
            <span className="bv-meta-row-label">Cập nhật</span>
            <span className="bv-meta-row-value">{updated}</span>
          </div>
        ) : null}
        <div className="bv-meta-row">
          <span className="bv-meta-row-label">Lượt xem</span>
          <span className="bv-meta-row-value">{formatViewCount(luot_xem)}</span>
        </div>
        <div className="bv-meta-row">
          <span className="bv-meta-row-label">Thời gian đọc</span>
          <span className="bv-meta-row-value">{readMin} phút đọc</span>
        </div>
      </div>
    </aside>
  );
}
