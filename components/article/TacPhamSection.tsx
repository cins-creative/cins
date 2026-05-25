import Image from "next/image";
import Link from "next/link";

import { NGHE_GALLERY } from "@/components/article/nghe/static/nghe-static-data";
import { getCoverUrl } from "@/lib/articles/cover";
import type { TacPhamGalleryItem } from "@/lib/articles/types";

type Props = {
  items: TacPhamGalleryItem[];
  /** Hiện gallery placeholder cộng đồng (giống trang nghề) khi chưa có tác phẩm gắn bài. */
  showCommunityFallback?: boolean;
  viewAllHref?: string;
};

export function TacPhamSection({
  items,
  showCommunityFallback = false,
  viewAllHref = "/bai-viet",
}: Props) {
  const hasDbItems = items.length > 0;
  if (!hasDbItems && !showCommunityFallback) return null;

  return (
    <section aria-labelledby="arv2-tac-pham-heading">
      <div className="section-link">
        <h3 id="arv2-tac-pham-heading">
          Tác phẩm liên quan
          <em> — từ cộng đồng CINs</em>
        </h3>
        <Link href={viewAllHref}>Xem tất cả →</Link>
      </div>
      <div className="gallery">
        {hasDbItems
          ? items.map((t) => {
              const img = getCoverUrl(t.cover_id);
              const label = t.author_slug
                ? `@${t.author_slug}`
                : t.author_name
                  ? t.author_name
                  : t.loai_tac_pham ?? "—";
              return (
                <article key={t.id} className="gal-item">
                  <div className="thumb">
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        width={400}
                        height={300}
                        sizes="(max-width: 900px) 33vw, 280px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="info">
                    <span className="av" aria-hidden />
                    <span className="nm">{t.tieu_de ?? "Không tiêu đề"}</span>
                  </div>
                  <div className="gal-meta">{label}</div>
                </article>
              );
            })
          : NGHE_GALLERY.map((g) => (
              <div key={g.handle} className="gal-item">
                <div className="thumb" />
                <div className="info">
                  <span className="av" style={{ background: g.av }} aria-hidden />
                  <span className="nm">{g.handle}</span>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
