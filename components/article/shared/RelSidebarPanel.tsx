import { NgheRelItem } from "@/components/article/nghe/NgheRelParts";
import type { ArticleCard } from "@/lib/articles/types";

export function RelSidebarHeader({
  title,
  em,
  hint,
}: {
  title: string;
  em?: string;
  hint?: string;
}) {
  return (
    <div className="rel-header">
      <h4>
        {title}
        {em ? <> <em>{em}</em></> : null}
      </h4>
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function RelSidebarList({
  cards,
  empty,
  /** Chỉ thumb + tiêu đề (không badge loại, không tóm tắt inline). */
  compactItem = false,
}: {
  cards: ArticleCard[];
  empty: string;
  compactItem?: boolean;
}) {
  if (!cards.length) {
    return <p className="nghe-side-empty">{empty}</p>;
  }
  return (
    <div className="rel-list">
      {cards.map((card) => (
        <NgheRelItem
          key={card.id}
          card={card}
          tipClass="tip-left"
          showTag={!compactItem}
          showSummary={!compactItem}
        />
      ))}
    </div>
  );
}
