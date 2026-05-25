import Link from "next/link";

import type { BlogRelatedCard } from "@/lib/bai-viet/types";

type Props = {
  items: BlogRelatedCard[];
};

export function BaiVietRelatedArticles({ items }: Props) {
  if (!items.length) return null;

  return (
    <section className="bv-related-section" aria-labelledby="bv-related-heading">
      <h2 id="bv-related-heading" className="bv-related-title">
        Bài viết liên quan
      </h2>
      <div className="bv-related-grid">
        {items.map((r) => (
          <Link key={r.id} href={`/bai-viet/${r.slug}`} className="bv-related-card">
            <span className="bv-related-card-eyebrow">{r.eyebrow ?? "Bài viết"}</span>
            <h3 className="bv-related-card-title">{r.tieu_de}</h3>
            <span className="bv-related-card-arrow" aria-hidden>
              Đọc tiếp →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
