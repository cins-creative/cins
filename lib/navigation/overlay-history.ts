/**
 * Lớp overlay / sheet trên history — Back (mobile) đóng lớp thay vì thoát trang.
 * State key trên `history.state` để nhận đúng entry của mình.
 */

export const CINS_HISTORY_POST = "cinsPostOverlay";
export const CINS_HISTORY_CMT = "cinsCmtSheet";
/** Overlay tin nhắn full — URL `/chat` (pushState, không remount Next). */
export const CINS_HISTORY_CHAT = "cinsChatOverlay";
export const CHAT_ROUTE_HREF = "/chat";

export function withSearchParam(
  key: string,
  value: string,
  baseHref?: string,
): string {
  const url = new URL(
    baseHref ?? window.location.href,
    window.location.origin,
  );
  url.searchParams.set(key, value);
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export function withoutSearchParam(key: string, baseHref?: string): string {
  const url = new URL(
    baseHref ?? window.location.href,
    window.location.origin,
  );
  url.searchParams.delete(key);
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export function readSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(key);
}

type HistoryStateBag = Record<string, unknown>;

export function pushOverlayHistory(
  stateKey: string,
  id: string,
  href: string,
): void {
  const prev =
    typeof window.history.state === "object" && window.history.state
      ? (window.history.state as HistoryStateBag)
      : {};
  window.history.pushState({ ...prev, [stateKey]: id }, "", href);
}

/** Đóng bằng UI: back nếu đã push; nếu không thì gọi `onClosed`. */
export function closeOverlayViaHistory(
  pushedRef: { current: boolean },
  onClosed: () => void,
): void {
  if (pushedRef.current) {
    pushedRef.current = false;
    window.history.back();
    return;
  }
  onClosed();
}
