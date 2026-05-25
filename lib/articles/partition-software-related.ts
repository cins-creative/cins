import { partitionLienQuanSidebar } from "@/lib/articles/partition-lien-quan";
import type { ArticleCard } from "@/lib/articles/types";

function isLoai(card: ArticleCard, loai: string): boolean {
  return String(card.loai_bai_viet) === loai;
}

export function partitionSoftwareRelated(items: ArticleCard[]) {
  const nghe = items.filter((c) => isLoai(c, "nghe"));
  const keywords = items.filter((c) => isLoai(c, "keyword"));
  const similar = items.filter((c) => isLoai(c, "phan_mem"));
  const monHoc = pickMonHocCourses(items);
  const blogs = items.filter((c) => isLoai(c, "blog"));
  const other = items.filter((c) => {
    const l = String(c.loai_bai_viet);
    return !["nghe", "keyword", "phan_mem", "mon_hoc", "blog"].includes(l);
  });
  return { nghe, keywords, similar, monHoc, blogs, other };
}

/** Môn học / khóa gợi ý từ `article_lien_quan`. */
export function pickMonHocCourses(lienQuan: ArticleCard[]): ArticleCard[] {
  const { groups } = partitionLienQuanSidebar(lienQuan);
  return (
    groups.get("LIEN_QUAN")?.filter(
      (c) => String(c.loai_bai_viet) === "mon_hoc",
    ) ?? []
  );
}
