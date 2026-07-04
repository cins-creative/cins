export type HomeFeedDisplay = "feed" | "grid";

const GRID_QUERY = "luoi";

/** URL trang chủ theo chế độ xem — `/?display=luoi` (lưới) · `/` (feed). */
export function homeFeedHref(display: HomeFeedDisplay): string {
  return display === "grid" ? `/?display=${GRID_QUERY}` : "/";
}

/** Đọc chế độ xem từ pathname + search (client hoặc SSR). */
export function resolveHomeFeedDisplay(
  pathname: string,
  search = "",
): HomeFeedDisplay {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/luoi") return "grid";
  if (path !== "/") return "feed";
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q).get("display") === GRID_QUERY ? "grid" : "feed";
}

/** @deprecated Dùng `resolveHomeFeedDisplay(pathname, search)`. */
export function homeFeedDisplayFromPathname(pathname: string): HomeFeedDisplay {
  return resolveHomeFeedDisplay(pathname);
}
