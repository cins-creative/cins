/** Khoảng cách chèn block gợi ý xen kẽ timeline feed. */
export const FEED_INLINE_PROMO_INTERVAL = 6;

export type FeedPromoCard = {
  id: string;
  title: string;
  sub: string;
  href: string;
  imageUrl: string | null;
  /** Ảnh bìa hồ sơ — card người (`is-person`); avatar vẫn dùng `imageUrl`. */
  coverUrl?: string | null;
  /** Giai đoạn — card người (nhắn tin / preview chat). */
  giaiDoan?: string | null;
  /** Mô tả ngắn hồ sơ — card người. */
  bio?: string | null;
  /** Logo / avatar tổ chức — hiển thị cạnh tên org trên card khóa học / sự kiện. */
  orgLogoUrl?: string | null;
  /** Badge ngày trên cover — rail sự kiện. */
  dateBadge?: { month: string; day: string };
  /** Nhãn loại org — card studio (`is-org`). */
  typeLabel?: string | null;
  /** Tỉnh/thành — card studio. */
  location?: string | null;
  /** CTA theo dõi / nhắn tin — card org (`JourneyOrgPopoverActions`). */
  orgActionKind?: "studio" | "truong" | "co_so_dao_tao";
};

export type FeedPromoVariant = {
  kind: "courses" | "careers" | "people" | "schools" | "studios" | "events";
  title: string;
  moreHref: string;
  moreLabel?: string;
  items: FeedPromoCard[];
};
