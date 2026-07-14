/** Chế độ hiển thị mặc định của trang cá nhân Journey khi người khác truy cập
 *  (chỉ áp khi mở bare `/{slug}`, không có `?view=`).
 *  - `timeline`     → dòng thời gian Journey (ở lại bare URL; client sẽ pin
 *                     `?view=journey` để sticky sau action/F5)
 *  - `gallery`      → Gallery dạng thẻ   (?view=gallery)
 *  - `gallery_luoi` → Masonry layout     (?view=gallery&display=luoi) */
export type JourneyDefaultView = "timeline" | "gallery" | "gallery_luoi";

export const JOURNEY_DEFAULT_VIEW_VALUES: readonly JourneyDefaultView[] = [
  "timeline",
  "gallery",
  "gallery_luoi",
];

export function normalizeJourneyDefaultView(value: unknown): JourneyDefaultView {
  return value === "gallery" || value === "gallery_luoi" ? value : "timeline";
}

/** URL lần vào trang cá nhân theo chế độ mặc định (entry từ trang khác).
 *  Timeline dùng bare `/{slug}` — loader coi đó là tín hiệu áp mặc định. */
export function journeyDefaultViewHref(
  slug: string,
  view: JourneyDefaultView,
): string {
  const s = encodeURIComponent(slug);
  if (view === "gallery") return `/${s}?view=gallery`;
  if (view === "gallery_luoi") return `/${s}?view=gallery&display=luoi`;
  return `/${s}`;
}

export const JOURNEY_DEFAULT_VIEW_OPTIONS: ReadonlyArray<{
  value: JourneyDefaultView;
  label: string;
  desc: string;
}> = [
  {
    value: "timeline",
    label: "Dòng thời gian Journey",
    desc: "Người khác thấy hành trình theo mốc thời gian.",
  },
  {
    value: "gallery",
    label: "Gallery dạng thẻ",
    desc: "Lưới tác phẩm có bảng thông tin dưới mỗi ảnh.",
  },
  {
    value: "gallery_luoi",
    label: "Masonry layout",
    desc: "Bố cục tương tự Pinterest.",
  },
];
