export type GalleryDisplay = "card" | "grid";

export function galleryDisplayFromSearch(search: string): GalleryDisplay {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const display = new URLSearchParams(q).get("display");
  return display === "luoi" ? "grid" : "card";
}

/** URL gallery profile — `card` = mặc định, `grid` = lưới gọn (`display=luoi`). */
export function galleryDisplayHref(
  slug: string,
  display: GalleryDisplay,
  baseSearch = "",
): string {
  const params = new URLSearchParams(baseSearch);
  params.set("view", "gallery");
  if (display === "grid") {
    params.set("display", "luoi");
  } else {
    params.delete("display");
  }
  const qs = params.toString();
  return `/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}
