import Link from "next/link";

import type { ArticleCard } from "@/lib/articles/types";
import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";

function partitionRelated(items: ArticleCard[]) {
  const keywords = items.filter((i) => String(i.loai_bai_viet) === "keyword");
  const rest = items.filter((i) => String(i.loai_bai_viet) !== "keyword");
  const groups = new Map<string, ArticleCard[]>();
  for (const r of rest) {
    const k = (r.loai_quan_he?.trim() || "LIEN_QUAN").toUpperCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return { keywords, groups };
}

export function ArticleSidebar({ lienQuan }: { lienQuan: ArticleCard[] }) {
  const { keywords, groups } = partitionRelated(lienQuan);
  const hasAnyRelated = lienQuan.length > 0;

  return (
    <aside className="article-side" aria-label="Liên quan">
      {!hasAnyRelated ? (
        <div className="side-card">
          <h4>
            Bài viết liên quan
            <em>Trống</em>
          </h4>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink-body)",
              marginBottom: 12,
            }}
          >
            Bài này chưa được gắn liên kết tới bài khác trong hệ thống. Bạn có thể
            xem danh sách bài đã xuất bản.
          </p>
          <Link href="/bai-viet" className="side-card-cta-link">
            Mở danh sách bài viết →
          </Link>
        </div>
      ) : null}

      {keywords.length > 0 ? (
        <div className="side-card">
          <h4>
            Keyword liên quan
            <em>Gợi ý</em>
          </h4>
          <div>
            {keywords.map((k) => (
              <Link
                key={k.id}
                href={`/bai-viet/${k.slug}`}
                className="chip chip-keyword"
              >
                {k.tieu_de}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {[...groups.entries()].map(([key, cards]) => (
        <div key={key} className="side-card">
          <h4>{labelLoaiQuanHe(key)}</h4>
          <ul className="related">
            {cards.map((a) => (
              <li key={a.id}>
                <Link href={`/bai-viet/${a.slug}`}>{a.tieu_de}</Link>
                <span className="tag">
                  {String(a.loai_bai_viet).replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="side-card side-card-cta">
        <h4>
          Quiz hướng nghiệp
          <em>2 phút</em>
        </h4>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-body)" }}>
          Khám phá gợi ý nghề và lộ trình phù hợp với bạn.
        </p>
        <Link href="/" className="side-card-cta-link">
          Về trang chủ CINs →
        </Link>
      </div>
    </aside>
  );
}
