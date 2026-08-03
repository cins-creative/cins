/**
 * Vào/ra chế độ tuỳ chỉnh layout trang chủ — client-only khi đang ở `/`.
 * Tránh `router.push('/?tuy-chinh=1')` (SSR lại cả feed + module ~ vài giây).
 *
 * Edit mode + mục «Bố cục hiển thị» trong cài đặt chỉ dành cho desktop
 * (≥1200px — cả hai cột sidebar in-flow). Mobile/tablet không cần chỉnh.
 */

export const HOME_LAYOUT_EDIT_ENTER_EVENT = "cins-home-layout-edit-enter";

/** Match breakpoint cột L+R in-flow trên trang chủ (`world-journey-feed.css`). */
export const HOME_LAYOUT_EDIT_MQ = "(min-width: 1200px)";

/** Viewport đủ rộng để tuỳ chỉnh bố cục trang chủ (desktop). */
export function isHomeLayoutEditViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(HOME_LAYOUT_EDIT_MQ).matches;
}

/** Subscribe cho `useSyncExternalStore` — theo dõi breakpoint desktop layout. */
export function subscribeHomeLayoutEditViewport(
  onChange: () => void,
): () => void {
  const mq = window.matchMedia(HOME_LAYOUT_EDIT_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function getHomeLayoutEditViewportSnapshot(): boolean {
  return window.matchMedia(HOME_LAYOUT_EDIT_MQ).matches;
}

/** SSR snapshot — ẩn edit / mục bố cục (mobile-safe). */
export function getHomeLayoutEditViewportServerSnapshot(): boolean {
  return false;
}

/**
 * Bật edit mode tức thì nếu trang chủ đã mount + viewport desktop.
 * Trả true nếu đã phát event; false trên mobile/tablet hoặc không phải `/`.
 */
export function requestHomeLayoutEdit(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/") return false;
  if (!isHomeLayoutEditViewport()) return false;

  const url = new URL(window.location.href);
  // Gallery ẩn aside — về timeline trước khi edit.
  if (url.searchParams.get("view") === "gallery") {
    url.searchParams.delete("view");
    url.searchParams.delete("display");
  }
  url.searchParams.set("tuy-chinh", "1");
  const next = `${url.pathname}?${url.searchParams.toString()}`;
  const cur = `${window.location.pathname}${window.location.search}`;
  if (cur !== next) {
    window.history.pushState({ cinsHomeLayoutEdit: true }, "", next);
  }
  window.dispatchEvent(new Event(HOME_LAYOUT_EDIT_ENTER_EVENT));
  return true;
}

/** Đồng bộ URL khi thoát edit (không đụng Next router). */
export function clearHomeLayoutEditUrl(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("tuy-chinh")) return;
  url.searchParams.delete("tuy-chinh");
  const q = url.searchParams.toString();
  window.history.replaceState(
    {},
    "",
    q ? `${url.pathname}?${q}` : url.pathname,
  );
}

export function isHomeLayoutEditUrl(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.pathname === "/" &&
    new URLSearchParams(window.location.search).get("tuy-chinh") === "1"
  );
}
