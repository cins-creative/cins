/** Số bài render/load mỗi lần trên World Journey feed. */
export const WORLD_JOURNEY_FEED_PAGE_SIZE = 12;

/** Prefetch thêm trước viewport (px) — sentinel IntersectionObserver. */
export const WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN = "720px 0px";

/**
 * Soft quota mặc định: tối đa N bài / tác giả (hoặc org) giữ vị trí ưu tiên
 * trong pool đã rank; phần dư đẩy xuống sau (tránh một người nuốt feed).
 */
export const WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA = 2;
