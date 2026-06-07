/** Giữ menu portal (position: fixed) trong viewport — căn phải nút trigger, lật lên nếu thiếu chỗ. */
export function computeFixedMenuPosition(
  trigger: DOMRect,
  menuSize: { width: number; height: number },
  options?: { gap?: number; margin?: number },
): { top: number; left: number } {
  const gap = options?.gap ?? 6;
  const margin = options?.margin ?? 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { width, height } = menuSize;

  let left = trigger.right - width;
  left = Math.max(margin, Math.min(left, vw - width - margin));

  let top = trigger.bottom + gap;
  if (top + height > vh - margin) {
    const above = trigger.top - height - gap;
    if (above >= margin) top = above;
    else top = Math.max(margin, vh - height - margin);
  }

  return { top, left };
}

type CenteredAnchoredMenuOptions = {
  gap?: number;
  margin?: number;
  /** Chiều cao tối đa mong muốn (px) — sẽ clamp theo viewport. */
  maxHeightCap?: number;
  /** Chiều cao tối thiểu trước khi lật lên trên trigger. */
  minVisibleHeight?: number;
};

/** Menu căn giữa trigger — ưu tiên bung xuống dưới, thu `maxHeight` nếu thiếu chỗ. */
export function computeCenteredAnchoredMenuPosition(
  trigger: DOMRect,
  menuSize: { width: number; height: number },
  options?: CenteredAnchoredMenuOptions,
): { top: number; left: number; maxHeight: number } {
  const gap = options?.gap ?? 8;
  const margin = options?.margin ?? 12;
  const maxHeightCap = options?.maxHeightCap ?? 480;
  const minVisibleHeight = options?.minVisibleHeight ?? 180;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = Math.min(menuSize.width, vw - margin * 2);
  let left = trigger.left + trigger.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, vw - width - margin));

  const belowTop = trigger.bottom + gap;
  const spaceBelow = vh - belowTop - margin;
  let maxHeight = Math.min(maxHeightCap, vh * 0.7, spaceBelow);

  if (maxHeight >= minVisibleHeight) {
    return { top: belowTop, left, maxHeight };
  }

  const spaceAbove = trigger.top - gap - margin;
  const aboveMaxHeight = Math.min(maxHeightCap, vh * 0.7, spaceAbove);
  if (aboveMaxHeight >= minVisibleHeight) {
    const height = Math.min(menuSize.height, aboveMaxHeight);
    return {
      top: Math.max(margin, trigger.top - gap - height),
      left,
      maxHeight: aboveMaxHeight,
    };
  }

  maxHeight = Math.min(maxHeightCap, vh * 0.7, vh - margin * 2);
  const top = Math.max(
    margin,
    Math.min(belowTop, vh - maxHeight - margin),
  );
  return { top, left, maxHeight };
}

/** Scroll container của phần tử — scroll event không bubble lên window. */
export function collectScrollResizeTargets(
  el: HTMLElement | null,
): Array<HTMLElement | Window> {
  const targets: Array<HTMLElement | Window> = [window];
  let node = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (
      /auto|scroll|overlay/.test(style.overflowY) ||
      /auto|scroll|overlay/.test(style.overflow)
    ) {
      targets.push(node);
    }
    node = node.parentElement;
  }
  return targets;
}
