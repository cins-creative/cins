import Image from "next/image";
import Link from "next/link";

import {
  relGradient,
  relInitials,
  relTagForCard,
} from "@/lib/articles/rel-visual";
import type { ArticleCard } from "@/lib/articles/types";

type Props = {
  card: ArticleCard;
};

export function ArticleSidebarRelatedItem({ card }: Props) {
  const tag = relTagForCard(card);
  const thumb = card.thumb_url?.trim() || null;

  return (
    <Link href={`/bai-viet/${card.slug}`} className="side-related-item">
      <span
        className={`side-related-thumb${thumb ? " side-related-thumb--has-img" : ""}`}
        aria-hidden
      >
        {thumb ? (
          <Image src={thumb} alt="" width={56} height={42} unoptimized />
        ) : (
          <span
            className="side-related-thumb-ph"
            style={{ background: relGradient(card.id) }}
          >
            {relInitials(card.tieu_de)}
          </span>
        )}
      </span>
      <span className="side-related-body">
        <span className="side-related-title">{card.tieu_de}</span>
        {card.tom_tat ? (
          <span className="side-related-desc">{card.tom_tat}</span>
        ) : null}
        <span className={tag.className}>{tag.label}</span>
      </span>
      <span className="side-related-arrow" aria-hidden>
        →
      </span>
    </Link>
  );
}
