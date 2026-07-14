/**
 * Bộ lọc *nguồn nội dung* của World Journey (trang chủ) — trục lọc riêng, độc
 * lập với lọc media / lĩnh vực / sắp xếp.
 *
 * Đổi nguồn → client gọi lại `GET /api/world-journey/feed?source=…` (cùng
 * `filter` / `linhVuc` nếu đang bật).
 *
 * - `all`       → Khám phá tất cả (mọi nguồn, kể cả khám phá người lạ). Mặc định.
 * - `following` → Theo dõi (chỉ bạn bè + người/org/cộng đồng đang theo dõi).
 * - `user-only` → Chỉ người dùng (ẩn nội dung org; bài cộng đồng vẫn hiện).
 * - `org-only`  → Chỉ tổ chức (chỉ nội dung org; ẩn người dùng & cộng đồng).
 *
 * Mặc định lưu localStorage (device-local) như `home-feed-layout`. Khi đổi trong
 * cài đặt, phát sự kiện để feed đang mở áp dụng ngay.
 */

export type FeedSourceFilter = "all" | "following" | "user-only" | "org-only";

/**
 * Nguồn của một item feed/gallery — gắn ở server:
 * - `user`      → nội dung do người dùng đăng (mình / bạn bè / theo dõi / khám phá).
 * - `cong_dong` → bài đăng trong cộng đồng (tính là người dùng, ẩn khi "chỉ tổ chức").
 * - `org`       → nội dung org (trường / cơ sở / studio / sự kiện).
 */
export type FeedSourceKind = "user" | "cong_dong" | "org";

/** Nhãn nguồn gắn vào item để client lọc theo `FeedSourceFilter`. */
export type FeedSourceTag = {
  feedSource?: FeedSourceKind;
  /** Item đến từ quan hệ theo dõi (mình / bạn bè / đang theo dõi / thành viên). */
  feedFollowing?: boolean;
};

export const FEED_SOURCE_DEFAULT: FeedSourceFilter = "all";

export const FEED_SOURCE_STORAGE_KEY = "cins-feed-source";

/** Sự kiện phát khi đổi mặc định trong cài đặt (cùng tab). */
export const FEED_SOURCE_CHANGE_EVENT = "cins-feed-source-change";

export const FEED_SOURCE_OPTIONS: ReadonlyArray<{
  value: FeedSourceFilter;
  label: string;
  desc: string;
  /** Tên icon (map sang lucide ở component). */
  icon: string;
}> = [
  {
    value: "all",
    label: "Khám phá tất cả",
    desc: "Nội dung từ mọi người và mọi tổ chức, kể cả người bạn chưa theo dõi.",
    icon: "globe",
  },
  {
    value: "following",
    label: "Theo dõi",
    desc: "Chỉ bạn bè và người, tổ chức, cộng đồng bạn đang theo dõi.",
    icon: "users",
  },
  {
    value: "user-only",
    label: "Chỉ người dùng",
    desc: "Ẩn nội dung tổ chức; vẫn giữ bài của cộng đồng.",
    icon: "user",
  },
  {
    value: "org-only",
    label: "Chỉ tổ chức",
    desc: "Chỉ nội dung từ trường, cơ sở, studio và sự kiện.",
    icon: "building",
  },
];

export function normalizeFeedSource(value: unknown): FeedSourceFilter {
  return value === "following" ||
    value === "user-only" ||
    value === "org-only"
    ? value
    : FEED_SOURCE_DEFAULT;
}

export function feedSourceLabel(filter: FeedSourceFilter): string {
  return (
    FEED_SOURCE_OPTIONS.find((opt) => opt.value === filter)?.label ??
    FEED_SOURCE_OPTIONS[0].label
  );
}

/** Item khớp bộ lọc nguồn hay không (dùng chung milestone & gallery). */
export function matchesFeedSource(
  item: FeedSourceTag,
  filter: FeedSourceFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "following") return item.feedFollowing === true;
  const source = item.feedSource ?? "user";
  if (filter === "user-only") return source !== "org";
  return source === "org";
}

export function readFeedSourceDefault(): FeedSourceFilter {
  if (typeof window === "undefined") return FEED_SOURCE_DEFAULT;
  try {
    return normalizeFeedSource(
      window.localStorage.getItem(FEED_SOURCE_STORAGE_KEY),
    );
  } catch {
    return FEED_SOURCE_DEFAULT;
  }
}

/** Lưu mặc định + phát sự kiện cho feed cùng tab cập nhật ngay. */
export function setFeedSourceDefault(filter: FeedSourceFilter): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FEED_SOURCE_STORAGE_KEY, filter);
  } catch {
    /* bỏ qua khi localStorage bị chặn */
  }
  window.dispatchEvent(
    new CustomEvent<FeedSourceFilter>(FEED_SOURCE_CHANGE_EVENT, {
      detail: filter,
    }),
  );
}
