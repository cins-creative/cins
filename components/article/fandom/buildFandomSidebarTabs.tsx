import { RelSidebarHeader } from "@/components/article/shared/RelSidebarPanel";
import { RelSidebarList } from "@/components/article/shared/RelSidebarPanel";
import type { NgheSidebarTabConfig } from "@/components/article/nghe/NgheSidebarTabs";
import type { ArticleCard } from "@/lib/articles/types";

export function buildFandomSidebarTabs(
  keywords: ArticleCard[],
  phanMem: ArticleCard[],
  fandoms: ArticleCard[],
): NgheSidebarTabConfig[] {
  const tabs: NgheSidebarTabConfig[] = [];

  if (keywords.length > 0) {
    tabs.push({
      id: "keyword",
      label: "Kỹ thuật",
      header: (
        <RelSidebarHeader
          title="Kỹ thuật / khái niệm"
          em={`${keywords.length} mục`}
          hint="Hover để xem mô tả"
        />
      ),
      body: (
        <RelSidebarList
          cards={keywords}
          empty="Chưa có kỹ thuật liên quan."
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

  if (fandoms.length > 0) {
    tabs.push({
      id: "fandom",
      label: "Fandom",
      header: (
        <RelSidebarHeader
          title="Fandom liên quan"
          em={`${fandoms.length} fandom`}
          hint="Hover để xem mô tả"
        />
      ),
      body: (
        <RelSidebarList
          cards={fandoms}
          empty="Chưa có fandom liên quan."
          compactItem
        />
      ),
    });
  }

  return tabs;
}

export function fandomDefaultSidebarTab(
  keywords: ArticleCard[],
  phanMem: ArticleCard[],
  fandoms: ArticleCard[],
): string {
  if (keywords.length > 0) return "keyword";
  if (phanMem.length > 0) return "phan_mem";
  if (fandoms.length > 0) return "fandom";
  return "keyword";
}
