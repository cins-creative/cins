/**
 * Khóa scroll trang nền khi overlay bài mở (`position: fixed`).
 *
 * `html { scroll-behavior: smooth }` (cins-styles) + `history.back()` từ
 * permalink khiến đóng popup nhìn như trượt từ đầu timeline xuống card
 * (thanh action / bình luận vào giữa màn). Ghi Y *trước* pushState, restore
 * bằng `scroll-behavior: auto`, chặn snap giữa lúc overlay mở/đóng.
 */

let lockCount = 0;
let savedY = 0;
let captured = false;
let frozen = false;
let prevRestoration: ScrollRestoration | null = null;
const pinTimers: number[] = [];

function withInstantScroll(fn: () => void): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  fn();
  html.style.scrollBehavior = prev;
}

function applySavedScroll(): void {
  if (typeof window === "undefined") return;
  withInstantScroll(() => {
    window.scrollTo(0, savedY);
  });
}

function clearPinTimers(): void {
  for (const id of pinTimers) window.clearTimeout(id);
  pinTimers.length = 0;
}

function ensureManualRestoration(): void {
  if (typeof window === "undefined" || prevRestoration) return;
  prevRestoration = window.history.scrollRestoration;
  try {
    window.history.scrollRestoration = "manual";
  } catch {
    /* Safari cũ */
  }
}

/** Overlay đang khóa / vừa đóng — đừng snap action/BL vào giữa viewport. */
export function isOverlayScrollFrozen(): boolean {
  return lockCount > 0 || frozen;
}

/** Gỡ focus nút Đóng trước khi unmount — tránh browser scrollIntoView card. */
export function blurOverlayFocus(): void {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el instanceof HTMLElement && el !== document.body) {
    el.blur();
  }
}

/**
 * Gọi *trước* `pushState(permalink)` — Next có thể scroll về 0 ngay sau đó.
 * Giữ Y thật của timeline.
 */
export function captureOverlayPageScroll(): void {
  if (typeof window === "undefined") return;
  if (lockCount > 0 || captured) return;
  savedY = window.scrollY;
  captured = true;
  frozen = true;
  ensureManualRestoration();
}

/** Gọi ngay sau `pushState` — gỡ scroll-to-top của Next. */
export function pinOverlayPageScroll(): void {
  if (!captured) return;
  applySavedScroll();
}

export function lockOverlayPageScroll(): void {
  if (typeof window === "undefined") return;
  if (lockCount === 0) {
    if (!captured) savedY = window.scrollY;
    captured = true;
    frozen = true;
    ensureManualRestoration();
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${savedY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockOverlayPageScroll(): void {
  if (typeof window === "undefined" || lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  frozen = true;
  const body = document.body;
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.overflow = "";

  applySavedScroll();
  clearPinTimers();
  requestAnimationFrame(() => {
    applySavedScroll();
    requestAnimationFrame(applySavedScroll);
  });
  for (const ms of [0, 50, 120, 250, 400]) {
    pinTimers.push(window.setTimeout(applySavedScroll, ms));
  }
  pinTimers.push(
    window.setTimeout(() => {
      applySavedScroll();
      frozen = false;
      captured = false;
      if (prevRestoration) {
        try {
          window.history.scrollRestoration = prevRestoration;
        } catch {
          /* ignore */
        }
        prevRestoration = null;
      }
    }, 420),
  );
}
