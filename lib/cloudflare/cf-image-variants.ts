/** Tên variant Cloudflare Images — đồng bộ Dashboard + `scripts/cf-ensure-image-variants.mjs`. */

export type CfNamedVariant =
  | "public"
  | "avatar"
  | "cover"
  | "medium"
  | "thumbnail"
  | "grid"
  | "gridsm"
  | "feed"
  | "feedsm";

/** `sizes` cho ảnh đơn dọc 9:16 trên timeline / feed (~680px card). */
export const FEED_PORTRAIT_IMAGE_SIZES =
  "(max-width: 767px) 100vw, 680px";

/** Kích thước w descriptor trong srcset (khớp variant CF). */
export const FEED_PORTRAIT_SRCSET_WIDTHS = {
  feedsm: 720,
  feed: 1366,
} as const;

export const AVATAR_DISPLAY_PX = 96;
export const AVATAR_VARIANT_PX = 256;
