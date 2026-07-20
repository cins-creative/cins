/**
 * Giữ vị trí viewport khi xổ bài dài — neo theo khoảng cách từ mép trên
 * viewport tới card (không chỉ snapshot `scrollY` một lần).
 *
 * Chỉ re-pin trong cửa sổ `holdMs` (layout/ảnh đổ vào). Sau đó dừng hẳn;
 * nếu user cuộn thì hủy pin ngay — tránh giật về đầu bài khi scroll xuống
 * và ảnh lazy load kích ResizeObserver.
 */

export type ExpandScrollPin = {
  /** `getBoundingClientRect().top` lúc bắt đầu xổ. */
  viewportOffset: number;
};

export function captureExpandScrollPin(
  el: HTMLElement | null | undefined,
): ExpandScrollPin | null {
  if (!el || typeof window === "undefined") return null;
  return { viewportOffset: el.getBoundingClientRect().top };
}

/** Kéo scroll để card trở lại đúng offset đã neo. */
export function restoreExpandScrollPin(
  el: HTMLElement | null | undefined,
  pin: ExpandScrollPin | null | undefined,
): void {
  if (!el || !pin || typeof window === "undefined") return;
  const delta = el.getBoundingClientRect().top - pin.viewportOffset;
  if (Math.abs(delta) < 0.5) return;
  window.scrollBy({ top: delta, left: 0, behavior: "auto" });
}

type SubscribeOptions = {
  /** Theo dõi resize của node này (mặc định = el). */
  resizeTarget?: HTMLElement | null;
  /** Thời gian tối đa tiếp tục re-pin sau load async / ảnh (ms). */
  holdMs?: number;
};

const SCROLL_INTENT_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
  "Spacebar",
]);

/**
 * Re-pin ngay + rAF + ResizeObserver + vài nhịp sau khi ảnh/detail đổ vào.
 * Trả cleanup.
 */
export function subscribeExpandScrollPin(
  el: HTMLElement | null | undefined,
  pin: ExpandScrollPin | null | undefined,
  opts: SubscribeOptions = {},
): () => void {
  if (!el || !pin || typeof window === "undefined") return () => {};

  const resizeTarget = opts.resizeTarget ?? el;
  const holdMs = opts.holdMs ?? 2500;
  let cancelled = false;
  let restoring = false;
  let raf1 = 0;
  let raf2 = 0;
  const timeouts: number[] = [];
  let ro: ResizeObserver | null = null;

  const detachListeners = () => {
    ro?.disconnect();
    ro = null;
    el.removeEventListener("load", onLoad, true);
    window.removeEventListener("wheel", onUserIntent);
    window.removeEventListener("touchmove", onUserIntent);
    window.removeEventListener("keydown", onKeyIntent);
    window.removeEventListener("scroll", onScroll, true);
  };

  const stopPinning = () => {
    if (cancelled) return;
    cancelled = true;
    window.cancelAnimationFrame(raf1);
    window.cancelAnimationFrame(raf2);
    for (const id of timeouts) window.clearTimeout(id);
    timeouts.length = 0;
    detachListeners();
  };

  const onUserIntent = () => {
    stopPinning();
  };

  const onKeyIntent = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (SCROLL_INTENT_KEYS.has(event.key)) stopPinning();
  };

  const onScroll = () => {
    if (cancelled || restoring) return;
    stopPinning();
  };

  const restore = () => {
    if (cancelled) return;
    restoring = true;
    restoreExpandScrollPin(el, pin);
    window.requestAnimationFrame(() => {
      restoring = false;
    });
  };

  const onLoad = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!el.contains(target)) return;
    if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) {
      restore();
    }
  };

  restore();
  raf1 = window.requestAnimationFrame(() => {
    restore();
    raf2 = window.requestAnimationFrame(restore);
  });

  for (const delay of [50, 150, 350, 700, 1200]) {
    timeouts.push(window.setTimeout(restore, delay));
  }

  /* Hết cửa sổ settle → ngắt RO/load listener (không re-pin mãi khi đã xổ). */
  timeouts.push(window.setTimeout(stopPinning, holdMs));

  if (typeof ResizeObserver !== "undefined" && resizeTarget) {
    ro = new ResizeObserver(() => restore());
    ro.observe(resizeTarget);
  }

  el.addEventListener("load", onLoad, true);
  window.addEventListener("wheel", onUserIntent, { passive: true });
  window.addEventListener("touchmove", onUserIntent, { passive: true });
  window.addEventListener("keydown", onKeyIntent);
  window.addEventListener("scroll", onScroll, true);

  return stopPinning;
}
