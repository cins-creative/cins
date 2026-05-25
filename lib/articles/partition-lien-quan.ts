import type { ArticleCard } from "@/lib/articles/types";

/** Tách keyword và nhóm theo `loai_quan_he` (sidebar bài viết). */
export function partitionLienQuanSidebar(items: ArticleCard[]) {
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
