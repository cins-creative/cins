import type { ArticleCard } from "@/lib/articles/types";

function isLoai(card: ArticleCard, loai: string): boolean {
  return String(card.loai_bai_viet) === loai;
}

/** Phân nhóm `article_lien_quan` cho trang keyword (A → B). */
export function partitionKeywordRelated(items: ArticleCard[]) {
  const nghe = items.filter((c) => isLoai(c, "nghe"));
  const monHoc = items.filter((c) => isLoai(c, "mon_hoc"));
  const phanMem = items.filter((c) => isLoai(c, "phan_mem"));
  const keywords = items.filter((c) => isLoai(c, "keyword"));
  const nganh = items.filter((c) => isLoai(c, "nganh_dao_tao"));
  const blogs = items.filter((c) => isLoai(c, "blog"));
  const other = items.filter((c) => {
    const l = String(c.loai_bai_viet);
    return ![
      "nghe",
      "mon_hoc",
      "phan_mem",
      "keyword",
      "nganh_dao_tao",
      "blog",
    ].includes(l);
  });
  return { nghe, monHoc, phanMem, keywords, nganh, blogs, other };
}
