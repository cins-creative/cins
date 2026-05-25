import { BaiVietHubCardLabels } from "@/components/bai-viet/BaiVietHubCardLabels";
import { baiVietHubCardAriaLabel } from "@/lib/bai-viet/hub-card";
import { BaiVietHubCardLink } from "@/components/bai-viet/BaiVietHubCardLink";
import { BaiVietHubCardThumb } from "@/components/bai-viet/BaiVietHubCardThumb";
import { getAdminArticleThumbDisplayUrl } from "@/lib/admin/article-display";
import { hubLoaiDeptTheme } from "@/lib/bai-viet/hub-loai";
import type { BlogHubRow } from "@/lib/bai-viet/types";
import { formatViewCount } from "@/lib/bai-viet/utils";
import { articlePublicHref } from "@/lib/articles/article-href";

type Props = {
  row: BlogHubRow;
};

export function BaiVietArticleCard({ row }: Props) {
  const href = articlePublicHref(row.loai_bai_viet, row.slug);
  const fallback = getAdminArticleThumbDisplayUrl({
    thumbnail: row.thumbnail,
    cover_id: row.cover_id,
  });
  const thumbSrc = row.thumb_url ?? row.cover_url ?? fallback;
  const groupLabel = row.ky_thuat?.ten ?? row.bo_phan?.ten ?? null;
  const vi =
    row.tieu_de_eng?.trim() &&
    row.tieu_de_eng.trim().toLowerCase() !== row.tieu_de.trim().toLowerCase()
      ? row.tieu_de_eng.trim()
      : null;

  const tooltip = row.tom_tat?.trim() || null;

  return (
    <li>
      <BaiVietHubCardLink
        href={href}
        className="hn-role-card"
        data-dept={hubLoaiDeptTheme(row.loai_bai_viet)}
        ariaLabel={baiVietHubCardAriaLabel(row.tieu_de, vi, tooltip)}
        tooltip={tooltip}
      >
        <BaiVietHubCardThumb src={thumbSrc} title={row.tieu_de} />
        <div className="hn-role-body">
          <BaiVietHubCardLabels
            groupLabel={groupLabel}
            title={row.tieu_de}
            titleVi={vi}
            tooltip={tooltip}
          />
          <footer className="hn-role-foot">
            <span className="bv-hub-role-meta">{formatViewCount(row.luot_xem)} lượt xem</span>
            <span className="hn-role-arrow" aria-hidden>
              →
            </span>
          </footer>
        </div>
      </BaiVietHubCardLink>
    </li>
  );
}
