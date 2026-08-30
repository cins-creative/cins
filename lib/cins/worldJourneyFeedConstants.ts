/** Số bài render/load mỗi lần trên World Journey feed (timeline). */
export const WORLD_JOURNEY_FEED_PAGE_SIZE = 12;

/**
 * Gallery lưới dày hơn timeline (~3–4 cột) — mỗi trang lấy nhiều ô hơn.
 * 36 ≈ 3× feed page (12).
 */
export const WORLD_JOURNEY_GALLERY_PAGE_SIZE = 36;

/**
 * Pool lean mặc định (filter/source = all): ~2 trang + buffer.
 * Tránh dựng 120–360 ô rồi mới slice trang đầu.
 */
export const WORLD_JOURNEY_GALLERY_LEAN_POOL = 80;

/** Pool rộng khi filter/source ≠ all — vẫn nhỏ hơn bản cũ 360. */
export const WORLD_JOURNEY_GALLERY_WIDE_POOL = 240;

/** Reels / video surface — ít item mỗi trang (full-bleed snap). */
export const WORLD_JOURNEY_VIDEO_PAGE_SIZE = 8;

/** Pan tab World Journey (composer + body). Khớp `--wj-tab-pan-ms` trong CSS. */
export const WORLD_JOURNEY_TAB_PAN_MS = 420;

/** Listing masonry tab Video — ~4 cột × vài hàng trước khi cuộn tải thêm. */
export const WORLD_JOURNEY_VIDEO_LISTING_PAGE_SIZE = 24;

/** Số video dọc mỗi railbar xen feed trang chủ. */
export const WORLD_JOURNEY_VIDEO_RAIL_SIZE = 5;

/**
 * Pool video dọc tải trang đầu — đủ vài vòng rail (top + xen kẽ).
 * Client wrap-around khi hết pool.
 */
export const WORLD_JOURNEY_VIDEO_RAIL_POOL = 24;

/**
 * Quét pool rộng khi dựng tab Video — gallery thường lấy ~360 bài lẫn ảnh;
 * video Stream dễ bị cắt hết trước khi filter `media=video`.
 */
export const WORLD_JOURNEY_VIDEO_SCAN_LIMIT = 900;

/**
 * Prefetch khi còn khoảng N bài tới cuối timeline (sentinel chèn sau bài
 * `length - N`), không đợi user chạm đáy.
 */
export const WORLD_JOURNEY_FEED_PREFETCH_REMAINING_POSTS = 3;

/**
 * rootMargin cho IntersectionObserver (top/right/bottom/left). Đáy nới rộng
 * (~1000px) để prefetch sớm và bù cho cuộn quán tính (fling) trên mobile — nơi
 * sentinel 1px dễ bị "nhảy" qua giữa 2 frame lấy mẫu của observer. Prefetch theo
 * số bài (`PREFETCH_REMAINING_POSTS`) vẫn giữ, đây là lớp cushion bổ sung.
 */
export const WORLD_JOURNEY_FEED_SCROLL_ROOT_MARGIN = "400px 0px 1000px 0px";

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

/**
 * Cold start: bài `public` (Công khai) lên World Timeline cho mọi viewer —
 * không cần bạn bè / theo dõi (nới tạm L18).
 * Tắt (`false`) → quay L18: `public` chỉ friend/follow; pool global chỉ `feature`.
 */
export const WORLD_JOURNEY_PUBLIC_GLOBAL_FEED = true;
