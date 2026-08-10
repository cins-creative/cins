import type { ArticleCard } from "@/lib/articles/types";

function isLoai(card: ArticleCard, loai: string): boolean {
  return String(card.loai_bai_viet) === loai;
}

/** Phân nhóm `article_lien_quan` cho trang fandom (A → B). */
export function partitionFandomRelated(items: ArticleCard[]) {
  const keywords = items.filter((c) => isLoai(c, "keyword"));
  const phanMem = items.filter((c) => isLoai(c, "phan_mem"));
  const fandoms = items.filter((c) => isLoai(c, "fandom"));
  const nghe = items.filter((c) => isLoai(c, "nghe"));
  const other = items.filter((c) => {
    const l = String(c.loai_bai_viet);
    return !["keyword", "phan_mem", "fandom", "nghe"].includes(l);
  });
  return { keywords, phanMem, fandoms, nghe, other };
}
