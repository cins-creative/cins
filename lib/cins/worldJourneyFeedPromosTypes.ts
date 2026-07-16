/** Khoảng cách chèn block gợi ý xen kẽ timeline feed. */
export const FEED_INLINE_PROMO_INTERVAL = 6;

export type FeedPromoCard = {
  id: string;
  title: string;
  sub: string;
  href: string;
  imageUrl: string | null;
  /** Logo / avatar tổ chức — hiển thị cạnh tên org trên card khóa học / sự kiện. */
  orgLogoUrl?: string | null;
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
