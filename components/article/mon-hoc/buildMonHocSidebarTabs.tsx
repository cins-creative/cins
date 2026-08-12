import { partitionLienQuanSidebar } from "@/lib/articles/partition-lien-quan";
import type { ArticleCard } from "@/lib/articles/types";

/** Môn học liên quan (khối «Các khóa học liên quan»). */
export function pickMonHocCourseCards(
  lienQuan: ArticleCard[],
  excludeArticleId?: string,
): ArticleCard[] {
  const { groups } = partitionLienQuanSidebar(lienQuan);
  const raw =
    groups.get("LIEN_QUAN")?.filter(
      (c) => String(c.loai_bai_viet) === "mon_hoc",
    ) ??
    groups.get("LIEN_QUAN") ??
    [];
  if (!excludeArticleId) return raw;
  return raw.filter((c) => c.id !== excludeArticleId);
}
