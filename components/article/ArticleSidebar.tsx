import Link from "next/link";

import { ArticleSidebarRelatedItem } from "@/components/article/ArticleSidebarRelatedItem";
import { ArticleSidebarTabs } from "@/components/article/ArticleSidebarTabs";
import type { ArticleSidebarTab } from "@/components/article/ArticleSidebarTabs";
import { partitionLienQuanSidebar } from "@/lib/articles/partition-lien-quan";
import type { ArticleCard } from "@/lib/articles/types";
import { labelLoaiQuanHe } from "@/lib/articles/quan-he-labels";

const GROUP_TAB_ORDER = [
  "DUNG_TRONG_NGANH",
  "LIEN_QUAN",
  "DUNG_TRONG_NGHE",
  "THUOC_LINH_VUC",
  "TIEN_QUYET",
] as const;

/** Nhãn ngắn trên tablist (giống NgheSidebarTabs). */
const TAB_BUTTON_LABELS: Record<string, string> = {
  keyword: "Kỹ thuật",
  DUNG_TRONG_NGANH: "Ngành học",
  LIEN_QUAN: "Liên quan",
  DUNG_TRONG_NGHE: "Nghề liên quan",
  THUOC_LINH_VUC: "Lĩnh vực",
  TIEN_QUYET: "Tiên quyết",
};

function tabButtonLabel(id: string): string {
  return TAB_BUTTON_LABELS[id] ?? labelLoaiQuanHe(id);
}

function sortGroupKeys(keys: string[]): string[] {
  const order = new Map(
    GROUP_TAB_ORDER.map((k, i) => [k, i] as const),
  );
  return [...keys].sort((a, b) => {
    const ia = order.get(a as (typeof GROUP_TAB_ORDER)[number]) ?? 99;
    const ib = order.get(b as (typeof GROUP_TAB_ORDER)[number]) ?? 99;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, "vi");
  });
}

function SideCardHeader({
  title,
  hint,
  count,
}: {
  title: string;
  hint?: string;
  count?: number;
}) {
  return (
    <div className="side-card-head">
      <h4>
        {title}
        {hint ? <em>{hint}</em> : null}
      </h4>
      {typeof count === "number" ? (
        <span className="side-card-count">{count}</span>
      ) : null}
    </div>
  );
}

function relatedList(cards: ArticleCard[]) {
  return (
    <div className="side-related-list">
      {cards.map((card) => (
        <ArticleSidebarRelatedItem key={card.id} card={card} />
      ))}
    </div>
  );
}

function buildTabs(
  keywords: ArticleCard[],
  groups: Map<string, ArticleCard[]>,
): ArticleSidebarTab[] {
  const tabs: ArticleSidebarTab[] = [];

  if (keywords.length > 0) {
    tabs.push({
      id: "keyword",
      label: "Kỹ thuật",
      header: (
        <SideCardHeader
          title="Keyword liên quan"
          hint="Gợi ý"
          count={keywords.length}
        />
      ),
      body: (
        <div className="side-keyword-chips">
          {keywords.map((k) => (
            <Link
              key={k.id}
              href={`/bai-viet/${k.slug}`}
              className="chip chip-keyword"
            >
              {k.tieu_de}
            </Link>
          ))}
        </div>
      ),
    });
  }

  for (const key of sortGroupKeys([...groups.keys()])) {
    const cards = groups.get(key)!;
    tabs.push({
      id: key,
      label: tabButtonLabel(key),
      header: (
        <SideCardHeader title={labelLoaiQuanHe(key)} count={cards.length} />
      ),
      body: relatedList(cards),
    });
  }

  return tabs;
}

export function ArticleSidebar({ lienQuan }: { lienQuan: ArticleCard[] }) {
  const { keywords, groups } = partitionLienQuanSidebar(lienQuan);
  const tabs = buildTabs(keywords, groups);
  const hasAnyRelated = lienQuan.length > 0;

  return (
    <aside className="article-side" aria-label="Liên quan">
      {!hasAnyRelated ? (
        <div className="side-card">
          <SideCardHeader title="Bài viết liên quan" hint="Trống" />
          <p className="side-card-lead">
            Bài này chưa được gắn liên kết tới bài khác trong hệ thống. Bạn có thể
            xem danh sách bài đã xuất bản.
          </p>
          <Link href="/bai-viet" className="side-card-cta-link">
            Mở danh sách bài viết →
          </Link>
        </div>
      ) : (
        <ArticleSidebarTabs
          tabs={tabs}
          defaultTabId={
            groups.has("DUNG_TRONG_NGANH")
              ? "DUNG_TRONG_NGANH"
              : tabs[0]?.id
          }
        />
      )}

      <div className="side-card side-card-cta">
        <SideCardHeader title="Quiz hướng nghiệp" hint="2 phút" />
        <p className="side-card-lead">
          Khám phá gợi ý nghề và lộ trình phù hợp với bạn.
        </p>
        <Link href="/" className="side-card-cta-link">
          Về trang chủ CINs →
        </Link>
      </div>
    </aside>
  );
}
