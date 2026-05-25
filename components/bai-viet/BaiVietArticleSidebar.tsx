import Image from "next/image";
import Link from "next/link";

import type { BlogExploreLink, BlogRelatedCard } from "@/lib/bai-viet/types";
import { formatBlogDate } from "@/lib/bai-viet/utils";

type Props = {
  related: BlogRelatedCard[];
  explore: BlogExploreLink[];
};

function exploreDotClass(loai: string): string {
  if (loai === "mon_hoc") return "bv-side-item-dot bv-side-item-dot--mon";
  if (loai === "keyword") return "bv-side-item-dot bv-side-item-dot--keyword";
  return "bv-side-item-dot bv-side-item-dot--phan_mem";
}

export function BaiVietArticleSidebar({ related, explore }: Props) {
  return (
    <aside className="bv-detail-side">
      <div className="bv-side-sticky">
        {related.length > 0 ? (
          <div className="bv-side-block">
            <h2 className="bv-side-title">Bài viết liên quan</h2>
            <div className="bv-side-list">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/bai-viet/${r.slug}`}
                  className="bv-side-related"
                >
                  <span className="bv-side-related-thumb">
                    {r.cover_url ? (
                      <Image src={r.cover_url} alt="" width={40} height={40} unoptimized />
                    ) : null}
                  </span>
                  <span>
                    <span className="bv-side-related-title">{r.tieu_de}</span>
                    <span className="bv-side-related-date">
                      {formatBlogDate(r.tao_luc)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {explore.length > 0 ? (
          <div className="bv-side-block">
            <h2 className="bv-side-title">Khám phá liên quan</h2>
            <div className="bv-side-list">
              {explore.map((item) => (
                <Link
                  key={`${item.loai_bai_viet}-${item.id}`}
                  href={`/bai-viet/${item.slug}`}
                  className="bv-side-item"
                >
                  <span className={exploreDotClass(item.loai_bai_viet)} aria-hidden />
                  <span className="bv-side-item-name">{item.tieu_de}</span>
                  <span className="bv-side-item-arrow" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <Link href="/gallery" className="bv-side-cta">
          <strong>Xem tác phẩm trong Gallery</strong>
          Khám phá portfolio và journey từ cộng đồng sáng tạo CINs.
        </Link>
      </div>
    </aside>
  );
}
