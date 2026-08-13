/** Giphy Tenor-compat — key chỉ server (`GIPHY_API_KEY`). */
export const GIPHY_TENOR_HOST = "https://api.giphy.com";

export const GIPHY_CLIENT_KEY_DEFAULT = "cins_chat";

export const GIF_SEARCH_LIMIT = 24;

/** Featured hiện ngay khi mở picker — warmup ~20 preview. */
export const GIF_FEATURED_CACHE_LIMIT = 20;

export const GIF_FEATURED_CACHE_TTL_MS = 15 * 60_000;

export const GIF_CONTENT_FILTER = "medium";

export const GIF_MEDIA_FILTER = "tinygif,gif";

export const GIF_LOCALE = "vi_VN";

export const GIF_COUNTRY = "VN";

/** Browse (search/featured): ~30/phút/user. */
export const GIF_BROWSE_RATE_MAX = 30;
export const GIF_BROWSE_RATE_WINDOW_MS = 60_000;

/** Import → CF: ~20/phút/user. */
export const GIF_IMPORT_RATE_MAX = 20;
export const GIF_IMPORT_RATE_WINDOW_MS = 60_000;
