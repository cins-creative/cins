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
  /** Mô tả ngắn hồ sơ — card người / org. */
  bio?: string | null;
  /** Logo / avatar tổ chức — hiển thị cạnh tên org trên card khóa học / sự kiện. */
  orgLogoUrl?: string | null;
  /** Badge ngày trên cover — rail sự kiện. */
  dateBadge?: { month: string; day: string };
  /** Nhãn loại org — card studio (`is-org`). */
  typeLabel?: string | null;
  /** Tỉnh/thành — card studio / người (fallback bio). */
  location?: string | null;
  /** CTA theo dõi / nhắn tin — card org (`JourneyOrgPopoverActions`). */
  orgActionKind?: "studio" | "truong" | "co_so_dao_tao";
};

export type FeedPromoKind =
  | "courses"
  | "careers"
  | "people"
  | "schools"
  | "studios"
  | "events";

export type FeedPromoVariant = {
  kind: FeedPromoKind;
  title: string;
  moreHref: string;
  moreLabel?: string;
  items: FeedPromoCard[];
  /** Rail người — `dense` = tiêu đề «Gợi ý kết nối thêm» (cùng cap 4 card). */
  density?: "normal" | "dense";
};

/** Breakpoint đếm card — khớp CSS feed. */
export type FeedPromoBreakpoint = "sm" | "md" | "lg";

/**
 * Chu kỳ cố định rail xen feed — tránh lặp cùng một loại liên tục.
 * S1 người → S2 sự kiện → S3 studio → S4 khóa học → S5 cơ sở → S6 người (dày) → lặp.
 */
export const FEED_PROMO_CYCLE = [
  { kind: "people", density: "normal" },
  { kind: "events", density: "normal" },
  { kind: "studios", density: "normal" },
  { kind: "courses", density: "normal" },
  { kind: "schools", density: "normal" },
  { kind: "people", density: "dense" },
] as const satisfies ReadonlyArray<{
  kind: FeedPromoKind;
  density: "normal" | "dense";
}>;

export type FeedPromoCycleSlot = (typeof FEED_PROMO_CYCLE)[number];

/**
 * Số card theo loại + mật độ + breakpoint.
 * Mobile (`sm`) ưu tiên đủ card để scroll ngang; desktop vẫn fill một hàng.
 * Người: tối đa 4 card / lần hiển thị.
 */
export const FEED_PROMO_VISIBLE_COUNTS: Record<
  FeedPromoKind,
  { normal: Record<FeedPromoBreakpoint, number>; dense?: Record<FeedPromoBreakpoint, number> }
> = {
  people: {
    normal: { sm: 4, md: 4, lg: 4 },
    dense: { sm: 4, md: 4, lg: 4 },
  },
  events: {
    normal: { sm: 4, md: 2, lg: 3 },
  },
  studios: {
    normal: { sm: 4, md: 2, lg: 3 },
  },
  courses: {
    normal: { sm: 4, md: 4, lg: 4 },
  },
  schools: {
    normal: { sm: 4, md: 4, lg: 5 },
  },
  careers: {
    normal: { sm: 4, md: 4, lg: 5 },
  },
};

/** Max cần fetch server-side cho một pool (đủ vài vòng chu kỳ). */
export const FEED_PROMO_POOL_FETCH = {
  people: 36,
  events: 12,
  studios: 12,
  courses: 20,
  schools: 20,
} as const;

export function feedPromoVisibleCount(
  kind: FeedPromoKind,
  density: "normal" | "dense" = "normal",
  bp: FeedPromoBreakpoint = "lg",
): number {
  const table = FEED_PROMO_VISIBLE_COUNTS[kind];
  const byBp =
    density === "dense" && table.dense ? table.dense : table.normal;
  return byBp[bp];
}

/** Media query khớp breakpoint đếm card. */
export function resolveFeedPromoBreakpoint(
  width: number,
): FeedPromoBreakpoint {
  if (width < 720) return "sm";
  if (width < 1100) return "md";
  return "lg";
}

/** Lấy slice từ pool theo kind — chèn rail theo chu kỳ, không lặp id trong cùng rail. */
export function takePromoSlice(
  pools: ReadonlyArray<FeedPromoVariant>,
  kind: FeedPromoKind,
  offset: number,
  count: number,
  density: "normal" | "dense" = "normal",
): FeedPromoVariant | null {
  const pool = pools.find((p) => p.kind === kind);
  if (!pool || pool.items.length === 0 || count <= 0) return null;

  const items: FeedPromoCard[] = [];
  for (let i = 0; i < count; i += 1) {
    const card = pool.items[(offset + i) % pool.items.length];
    if (!card) break;
    if (items.some((x) => x.id === card.id)) break;
    items.push(card);
  }
  if (items.length === 0) return null;

  return {
    ...pool,
    density,
    title:
      kind === "people" && density === "dense"
        ? "Gợi ý kết nối thêm"
        : pool.title,
    items,
  };
}
