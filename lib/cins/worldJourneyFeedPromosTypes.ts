/** Khoảng cách chèn block gợi ý xen kẽ timeline feed. */
export const FEED_INLINE_PROMO_INTERVAL = 8;

export type FeedPromoCard = {
  id: string;
  title: string;
  sub: string;
  href: string;
  imageUrl: string | null;
  /** Badge ngày trên cover — rail sự kiện. */
  dateBadge?: { month: string; day: string };
};

export type FeedPromoVariant = {
  kind: "courses" | "careers" | "people" | "schools" | "studios" | "events";
  title: string;
  moreHref: string;
  moreLabel?: string;
  items: FeedPromoCard[];
};
