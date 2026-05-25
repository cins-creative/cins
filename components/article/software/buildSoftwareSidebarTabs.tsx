import { RelSidebarHeader } from "@/components/article/shared/RelSidebarPanel";
import { RelSidebarList } from "@/components/article/shared/RelSidebarPanel";
import type { NgheSidebarTabConfig } from "@/components/article/nghe/NgheSidebarTabs";
import type { ArticleCard } from "@/lib/articles/types";

export function buildSoftwareSidebarTabs(
  nghe: ArticleCard[],
  keywords: ArticleCard[],
  similar: ArticleCard[],
): NgheSidebarTabConfig[] {
  const tabs: NgheSidebarTabConfig[] = [];

  if (nghe.length > 0) {
    tabs.push({
      id: "nghe",
      label: "Nghề",
      header: (
        <RelSidebarHeader
          title="Vị trí công việc"
          em={`${nghe.length} vị trí`}
          hint="Hover để xem mô tả"
        />
      ),
      body: (
        <RelSidebarList
          cards={nghe}
          empty="Chưa có vị trí nghề liên quan."
          compactItem
        />
      ),
    });
  }

  if (keywords.length > 0) {
    tabs.push({
      id: "keyword",
      label: "Keyword",
      header: (
        <RelSidebarHeader
          title="Keyword liên quan"
          em={`${keywords.length} keyword`}
          hint="Hover để xem mô tả"
        />
      ),
      body: (
        <RelSidebarList
          cards={keywords}
          empty="Chưa có keyword liên quan."
          compactItem
        />
      ),
    });
  }

  if (similar.length > 0) {
    tabs.push({
      id: "phan_mem",
      label: "Phần mềm",
      header: (
        <RelSidebarHeader
          title="Phần mềm tương tự"
          em={`${similar.length} phần mềm`}
          hint="Hover để xem mô tả"
        />
      ),
      body: (
        <RelSidebarList
          cards={similar}
          empty="Chưa có phần mềm so sánh."
          compactItem
        />
      ),
    });
  }

  return tabs;
}

export function softwareDefaultSidebarTab(
  nghe: ArticleCard[],
  keywords: ArticleCard[],
  similar: ArticleCard[],
): string {
  if (nghe.length > 0) return "nghe";
  if (keywords.length > 0) return "keyword";
  if (similar.length > 0) return "phan_mem";
  return "nghe";
}
