/**
 * Giữ vị trí viewport khi xổ bài dài — neo theo khoảng cách từ mép trên
 * viewport tới card (không chỉ snapshot `scrollY` một lần).
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
  let raf1 = 0;
  let raf2 = 0;
  const timeouts: number[] = [];

  const restore = () => {
    if (cancelled) return;
    restoreExpandScrollPin(el, pin);
  };

  restore();
  raf1 = window.requestAnimationFrame(() => {
    restore();
    raf2 = window.requestAnimationFrame(restore);
  });

  for (const delay of [50, 150, 350, 700, 1200, holdMs]) {
    timeouts.push(window.setTimeout(restore, delay));
  }

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined" && resizeTarget) {
    ro = new ResizeObserver(() => restore());
    ro.observe(resizeTarget);
  }

  const onLoad = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!el.contains(target)) return;
    if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) {
      restore();
    }
  };
  el.addEventListener("load", onLoad, true);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(raf1);
    window.cancelAnimationFrame(raf2);
    for (const id of timeouts) window.clearTimeout(id);
    ro?.disconnect();
    el.removeEventListener("load", onLoad, true);
  };
}
