import { RelSidebarHeader } from "@/components/article/shared/RelSidebarPanel";
import { RelSidebarList } from "@/components/article/shared/RelSidebarPanel";
import type { NgheSidebarTabConfig } from "@/components/article/nghe/NgheSidebarTabs";
import type { ArticleCard } from "@/lib/articles/types";

export function buildKeywordSidebarTabs(
  nghe: ArticleCard[],
  phanMem: ArticleCard[],
  keywords: ArticleCard[],
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

  if (phanMem.length > 0) {
    tabs.push({
      id: "phan_mem",
      label: "Phần mềm",
      header: (
        <RelSidebarHeader
          title="Phần mềm liên quan"
          em={`${phanMem.length} phần mềm`}
          hint="Hover để xem mô tả"
        />
      ),
      body: (
        <RelSidebarList
          cards={phanMem}
          empty="Chưa có phần mềm liên quan."
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

  return tabs;
}

export function keywordDefaultSidebarTab(
  nghe: ArticleCard[],
  phanMem: ArticleCard[],
  keywords: ArticleCard[],
): string {
  if (nghe.length > 0) return "nghe";
  if (phanMem.length > 0) return "phan_mem";
  if (keywords.length > 0) return "keyword";
  return "nghe";
}
