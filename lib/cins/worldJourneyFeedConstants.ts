/** Số bài render/load mỗi lần trên World Journey feed (timeline). */
export const WORLD_JOURNEY_FEED_PAGE_SIZE = 12;

/**
 * Gallery lưới dày hơn timeline (~3–4 cột) — mỗi trang lấy nhiều ô hơn.
 * 36 ≈ 3× feed page (12).
 */
export const WORLD_JOURNEY_GALLERY_PAGE_SIZE = 36;

/** Prefetch thêm trước viewport (px) — sentinel IntersectionObserver. */
export const WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN = "720px 0px";

/**
 * Soft quota mặc định: tối đa N bài / tác giả (hoặc org) giữ vị trí ưu tiên
 * trong pool đã rank; phần dư đẩy xuống sau (tránh một người nuốt feed).
 */
export const WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA = 2;

/**
 * Cửa sổ RAM cho bài vừa compose (client) — đủ để SSR/cache bắt kịp.
 * Không sống qua F5; first-impression session pin thay echo 1h cũ.
 */
export const WORLD_JOURNEY_OWN_PUBLISH_PIN_MS = 5 * 60 * 1000;

/** @deprecated Dùng first-impression session pin; giữ alias cho world-boost tạm. */
export const WORLD_JOURNEY_AUTHOR_ECHO_MS = WORLD_JOURNEY_OWN_PUBLISH_PIN_MS;

/** Cửa sổ “bài mới” — freshness + first-impression candidate (ms). */
export const WORLD_JOURNEY_FRESHNESS_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Số bài mới tối đa ghim top lần đầu (session tab); F5 → xếp lại theo điểm.
 */
export const WORLD_JOURNEY_FIRST_IMPRESSION_CAP = 3;

/**
 * Bài cộng đồng `cong_khai` từ phòng viewer chưa member/follow —
 * gợi ý có nhãn, giới hạn cứng mỗi lần rank.
 */
export const WORLD_JOURNEY_CONG_DONG_SUGGEST_LIMIT = 5;

/** Cache rank feed theo viewer (giây) — ngắn để điểm / first-impression phản hồi nhanh. */
export const WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC = 20;
