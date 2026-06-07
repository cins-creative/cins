"use client";

import Link from "next/link";

import { articlePublicHref } from "@/lib/articles/article-href";
import { articleTagLabel, articleTagLoaiClass } from "@/lib/editor/article-tag";
import type { CongDongCategory } from "@/lib/cong-dong/types";

function categoryLoaiShort(loai: string): string {
  if (loai === "nganh_dao_tao") return "Ngành";
  return articleTagLabel(loai);
}

function categoryChipMeta(item: CongDongCategory): string {
  return item.linhVucTen?.trim() || categoryLoaiShort(item.loaiBaiViet);
}

export function CongDongCategoryLinks({
  categories,
}: {
  categories: CongDongCategory[];
}) {
  if (!categories.length) return null;

  return (
    <section className="cd-v4-categories-block" aria-label="Chủ đề liên quan">
      <div className="cd-v4-divider cd-v4-divider--tight" />
      <h2 className="cd-v4-sec-title cd-v4-sec-title--tight">Chủ đề liên quan</h2>
      <ul className="cd-v4-categories">
        {categories.map((item) => {
          const meta = categoryChipMeta(item);
          const linkTitle = `${categoryLoaiShort(item.loaiBaiViet)}${meta ? ` · ${meta}` : ""} — ${item.tieuDe}`;

          return (
            <li key={item.id}>
              <Link
                href={articlePublicHref(item.loaiBaiViet, item.slug)}
                className="cd-v4-category-chip"
                title={linkTitle}
              >
                <span
                  className={`cd-v4-category-chip-accent ${articleTagLoaiClass(item.loaiBaiViet)}`}
                  aria-hidden
                />
                <span className="cd-v4-category-chip-body">
                  <span className="cd-v4-category-chip-title">{item.tieuDe}</span>
                  <span className="cd-v4-category-chip-meta">{meta}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
