export type GalleryDisplay = "card" | "grid";

/** Chấp nhận cả `luoi` (URL cũ đã share) dù middleware đã redirect sang `grid`. */
export function galleryDisplayFromSearch(search: string): GalleryDisplay {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const display = new URLSearchParams(q).get("display");
  return display === "grid" || display === "luoi" ? "grid" : "card";
}

/** URL gallery profile — `card` = mặc định, `grid` = lưới gọn (`display=grid`). */
export function galleryDisplayHref(
  slug: string,
  display: GalleryDisplay,
  baseSearch = "",
): string {
  const params = new URLSearchParams(baseSearch);
  params.set("view", "gallery");
  if (display === "grid") {
    params.set("display", "grid");
  } else {
    params.delete("display");
  }
  const qs = params.toString();
  return `/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}
