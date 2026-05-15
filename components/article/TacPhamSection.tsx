import Image from "next/image";

import { getCoverUrl } from "@/lib/articles/cover";
import type { TacPhamGalleryItem } from "@/lib/articles/types";

export function TacPhamSection({ items }: { items: TacPhamGalleryItem[] }) {
  if (!items.length) return null;

  return (
    <section aria-labelledby="arv2-tac-pham-heading">
      <div className="section-link">
        <h3 id="arv2-tac-pham-heading">
          Tác phẩm liên quan
          <em>— từ cộng đồng</em>
        </h3>
      </div>
      <div className="gallery">
        {items.map((t) => {
          const img = getCoverUrl(t.cover_id);
          const label = t.author_name
            ? t.author_slug
              ? `@${t.author_slug}`
              : t.author_name
            : t.author_slug
              ? `@${t.author_slug}`
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
        })}
      </div>
    </section>
  );
}
