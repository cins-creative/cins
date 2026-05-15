import Link from "next/link";

import type {
  ArticleCard,
  CotMocStub,
  TacPhamStub,
  TruongNganhRow,
} from "@/lib/articles/types";
import { ArticleLoaiBadge } from "@/components/article/ArticleLoaiBadge";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="article-section-title">{children}</h2>
  );
}

export function ArticleArchivedBanner() {
  return (
    <div
      className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      Bài viết này không còn được cập nhật (đã lưu trữ).
    </div>
  );
}

export function ArticleRelatedGrid({ items }: { items: ArticleCard[] }) {
  if (!items.length) return null;
  return (
    <section className="article-section" aria-labelledby="article-related-heading">
      <SectionTitle>Bài viết liên quan</SectionTitle>
      <ul className="article-card-grid">
        {items.map((a) => (
          <li key={a.id}>
            <Link href={`/bai-viet/${a.slug}`} className="article-card">
              <div className="article-card-top">
                <ArticleLoaiBadge loai={a.loai_bai_viet} />
                {a.loai_quan_he ? (
                  <span className="article-card-relation">{a.loai_quan_he}</span>
                ) : null}
              </div>
              <span className="article-card-title">{a.tieu_de}</span>
              {a.tom_tat ? (
                <span className="article-card-desc">{a.tom_tat}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArticleTruongSection({ rows }: { rows: TruongNganhRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="article-section" aria-labelledby="article-truong-heading">
      <SectionTitle>Các trường đào tạo</SectionTitle>
      <ul className="article-truong-list">
        {rows.map((r, i) => {
          const org = r.org_to_chuc;
          const name = org?.ten ?? r.ten_chuong_trinh ?? "Chương trình";
          return (
            <li key={`${name}-${i}`} className="article-truong-item">
              <div className="article-truong-name">{name}</div>
              {r.he_dao_tao ? (
                <div className="article-truong-meta">Hệ: {r.he_dao_tao}</div>
              ) : null}
              {r.ten_chuong_trinh && org?.ten ? (
                <div className="article-truong-sub">{r.ten_chuong_trinh}</div>
              ) : null}
              {typeof r.thoi_gian_thang === "number" ? (
                <div className="article-truong-meta">
                  Thời gian: {r.thoi_gian_thang} tháng
                </div>
              ) : null}
              {org?.slug ? (
                <span className="text-sm text-zinc-500">
                  Slug tổ chức: {org.slug}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ArticleGallerySection({ items }: { items: TacPhamStub[] }) {
  if (!items.length) return null;
  return (
    <section className="article-section" aria-labelledby="article-gallery-heading">
      <SectionTitle>Tác phẩm gắn thẻ</SectionTitle>
      <ul className="article-simple-list">
        {items.map((t) => (
          <li key={t.id} className="font-medium text-zinc-800">
            {t.tieu_de?.trim() || t.slug || t.id}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArticleJourneySection({ items }: { items: CotMocStub[] }) {
  if (!items.length) return null;
  return (
    <section className="article-section" aria-labelledby="article-journey-heading">
      <SectionTitle>Hành trình / cột mốc liên quan</SectionTitle>
      <ul className="article-simple-list">
        {items.map((c) => (
          <li key={c.id} className="font-medium text-zinc-800">
            {c.tieu_de?.trim() || c.slug || c.id}
          </li>
        ))}
      </ul>
    </section>
  );
}
