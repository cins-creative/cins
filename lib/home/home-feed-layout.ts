/**
 * Bố cục mặc định của trang chủ (World Journey feed) khi mở lần đầu.
 *
 * - `timeline` → dòng thời gian (bài viết xếp dọc theo mốc thời gian).
 * - `masonry`  → lưới Masonry kiểu gallery (ảnh xếp so le sát nhau).
 *
 * Lưu vào localStorage (device-local, không đồng bộ server) — cùng kiểu với
 * `theme-mode`. Khi đổi, phát sự kiện để feed đang mở phản ứng ngay lập tức.
 */

export type HomeFeedLayout = "timeline" | "masonry";

export const HOME_FEED_LAYOUT_STORAGE_KEY = "cins-home-feed-layout";

/** Sự kiện phát khi người dùng đổi bố cục trong cài đặt (cùng tab). */
export const HOME_FEED_LAYOUT_CHANGE_EVENT = "cins-home-feed-layout-change";

export const HOME_FEED_LAYOUT_OPTIONS: ReadonlyArray<{
  value: HomeFeedLayout;
  label: string;
  desc: string;
}> = [
  {
    value: "timeline",
    label: "Dòng thời gian",
    desc: "Bài viết xếp dọc theo mốc thời gian, kèm nội dung đầy đủ.",
  },
  {
    value: "masonry",
    label: "Lưới Masonry",
    desc: "Ảnh xếp so le sát nhau kiểu gallery, xem nhanh nhiều tác phẩm.",
  },
];

export function normalizeHomeFeedLayout(value: unknown): HomeFeedLayout {
  return value === "masonry" ? "masonry" : "timeline";
}

export function readHomeFeedLayout(): HomeFeedLayout {
  if (typeof window === "undefined") return "timeline";
  try {
    return normalizeHomeFeedLayout(
      window.localStorage.getItem(HOME_FEED_LAYOUT_STORAGE_KEY),
    );
  } catch {
    return "timeline";
  }
}

/** Lưu lựa chọn + phát sự kiện cho feed cùng tab cập nhật ngay. */
export function setHomeFeedLayout(layout: HomeFeedLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOME_FEED_LAYOUT_STORAGE_KEY, layout);
  } catch {
    /* bỏ qua khi localStorage bị chặn */
  }
  window.dispatchEvent(
    new CustomEvent<HomeFeedLayout>(HOME_FEED_LAYOUT_CHANGE_EVENT, {
      detail: layout,
    }),
  );
}
