import {
  RelSidebarHeader,
  RelSidebarList,
} from "@/components/article/shared/RelSidebarPanel";
import type { NgheSidebarTabConfig } from "@/components/article/nghe/NgheSidebarTabs";
import { partitionLienQuanSidebar } from "@/lib/articles/partition-lien-quan";
import type { ArticleCard } from "@/lib/articles/types";

/** Môn học liên quan (khối «Các khóa học liên quan» + tab sidebar). */
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

export function buildMonHocSidebarTabs(
  lienQuan: ArticleCard[],
  excludeArticleId?: string,
): NgheSidebarTabConfig[] {
  const { keywords, groups } = partitionLienQuanSidebar(lienQuan);
  const nganh =
    groups.get("DUNG_TRONG_NGANH") ??
    lienQuan.filter((c) => String(c.loai_bai_viet) === "nganh_dao_tao");
  const monLienQuan = pickMonHocCourseCards(lienQuan, excludeArticleId);

  return [
    {
      id: "nganh",
      label: "Ngành học",
      header: (
        <RelSidebarHeader
          title="Dùng trong ngành"
          em={
            nganh.length
              ? `${nganh.length} ngành ĐT`
              : "Chưa có"
          }
          hint={nganh.length > 0 ? "Hover để xem mã ngành & thời gian" : undefined}
        />
      ),
      body: (
        <RelSidebarList
          cards={nganh}
          empty="Chưa có ngành đào tạo liên quan."
          compactItem
        />
      ),
    },
    {
      id: "lien_quan",
      label: "Liên quan",
      header: (
        <RelSidebarHeader
          title="Môn học liên quan"
          em={
            monLienQuan.length
              ? `${monLienQuan.length} môn`
              : "Chưa có"
          }
          hint={monLienQuan.length > 0 ? "Hover để xem mô tả" : undefined}
        />
      ),
      body: (
        <RelSidebarList
          cards={monLienQuan}
          empty="Chưa có môn học liên quan."
          compactItem
        />
      ),
    },
    {
      id: "keyword",
      label: "Kỹ thuật",
      header: (
        <RelSidebarHeader
          title="Keyword liên quan"
          em={
            keywords.length
              ? `${keywords.length} kỹ thuật`
              : "Chưa có"
          }
          hint={keywords.length > 0 ? "Hover để xem mô tả" : undefined}
        />
      ),
      body: (
        <RelSidebarList
          cards={keywords}
          empty="Chưa gắn keyword — thêm liên kết trong admin."
          compactItem
        />
      ),
    },
  ];
}

export function monHocDefaultSidebarTab(
  lienQuan: ArticleCard[],
  excludeArticleId?: string,
): string {
  const { keywords, groups } = partitionLienQuanSidebar(lienQuan);
  const nganh =
    groups.get("DUNG_TRONG_NGANH") ??
    lienQuan.filter((c) => String(c.loai_bai_viet) === "nganh_dao_tao");
  const monLienQuan = pickMonHocCourseCards(lienQuan, excludeArticleId);
  if (nganh.length > 0) return "nganh";
  if (monLienQuan.length > 0) return "lien_quan";
  if (keywords.length > 0) return "keyword";
  return "nganh";
}
