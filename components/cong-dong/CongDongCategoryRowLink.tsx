import Link from "next/link";

import { articlePublicHref } from "@/lib/articles/article-href";
import { articleTagLabel, articleTagLoaiClass } from "@/lib/editor/article-tag";
import type { CongDongCategory } from "@/lib/cong-dong/types";

function categoryLoaiShort(loai: string): string {
  if (loai === "nganh_dao_tao") return "Ngành";
  return articleTagLabel(loai);
}

function categoryRowMeta(item: CongDongCategory): string {
  return item.linhVucTen?.trim() || categoryLoaiShort(item.loaiBaiViet);
}

export function CongDongCategoryRowLink({ item }: { item: CongDongCategory }) {
  const meta = categoryRowMeta(item);
  const href = articlePublicHref(item.loaiBaiViet, item.slug);

  return (
    <Link href={href} className="cd-v4-category-row" prefetch={false}>
      <span
        className={`cd-v4-category-row-dot ${articleTagLoaiClass(item.loaiBaiViet)}`}
        aria-hidden
      />
      <span className="cd-v4-category-row-title">{item.tieuDe}</span>
      {meta ? <span className="cd-v4-category-row-meta">{meta}</span> : null}
    </Link>
  );
}
