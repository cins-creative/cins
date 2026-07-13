/** Số bài render/load mỗi lần trên World Journey feed. */
export const WORLD_JOURNEY_FEED_PAGE_SIZE = 12;

/** Prefetch thêm trước viewport (px) — sentinel IntersectionObserver. */
export const WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN = "720px 0px";

/**
 * Soft quota mặc định: tối đa N bài / tác giả (hoặc org) giữ vị trí ưu tiên
 * trong pool đã rank; phần dư đẩy xuống sau (tránh một người nuốt feed).
 */
export const WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA = 2;

/** Bài của chính viewer vừa đăng — ghim ngắn trên feed của họ (ms). */
export const WORLD_JOURNEY_AUTHOR_ECHO_MS = 60 * 60 * 1000;

/** Cửa sổ “bài mới” cho cold-start rank (ms). */
export const WORLD_JOURNEY_FRESHNESS_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Bài cộng đồng `cong_khai` từ phòng viewer chưa member/follow —
 * gợi ý có nhãn, giới hạn cứng mỗi lần rank.
 */
export const WORLD_JOURNEY_CONG_DONG_SUGGEST_LIMIT = 5;

/** Cache rank feed theo viewer (giây) — ngắn để unseen/echo phản hồi nhanh. */
export const WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC = 20;
