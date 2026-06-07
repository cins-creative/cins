/** Desktop có hover + chuột chính xác → tooltip bám con trỏ. */
export function prefersCursorFollowTooltips(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

type TipSize = { width: number; height: number };

/** Tooltip fixed — bám con trỏ, lật trái/trên nếu sát mép viewport. */
export function computeCursorTooltipPosition(
  clientX: number,
  clientY: number,
  size: TipSize,
  options?: { offsetX?: number; offsetY?: number; margin?: number },
): { top: number; left: number } {
  const offsetX = options?.offsetX ?? 14;
  const offsetY = options?.offsetY ?? 14;
  const margin = options?.margin ?? 12;
  const { width, height } = size;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = clientX + offsetX;
  if (left + width > vw - margin) {
    left = clientX - width - offsetX;
  }
  left = Math.max(margin, Math.min(left, vw - width - margin));

  let top = clientY + offsetY;
  if (top + height > vh - margin) {
    top = clientY - height - offsetY;
  }
  top = Math.max(margin, Math.min(top, vh - height - margin));

  return { top, left };
}

/** Tooltip neo dưới/trên anchor — touch / mobile. */
export function computeAnchoredTooltipPosition(
  rect: DOMRect,
  size: TipSize,
  options?: { margin?: number; gap?: number },
): { top: number; left: number } {
  const margin = options?.margin ?? 12;
  const gap = options?.gap ?? 8;
  const { width, height } = size;

  const left = Math.min(
    Math.max(margin, rect.left),
    window.innerWidth - width - margin,
  );
  const spaceBelow = window.innerHeight - rect.bottom;
  const top =
    spaceBelow >= height + gap + margin
      ? rect.bottom + gap
      : Math.max(margin, rect.top - height - gap);

  return { top, left };
}

/** Tooltip có CTA — ưu tiên bung sang phải anchor, clamp trong viewport. */
export function computeInteractiveTooltipPosition(
  rect: DOMRect,
  size: TipSize,
  options?: { margin?: number; gap?: number },
): { top: number; left: number } {
  const margin = options?.margin ?? 12;
  const gap = options?.gap ?? 10;
  const { width, height } = size;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right + gap;
  if (left + width > vw - margin) {
    left = Math.max(margin, rect.left);
  }
  left = Math.max(margin, Math.min(left, vw - width - margin));

  let top = rect.top;
  if (top + height > vh - margin) {
    top = Math.max(margin, vh - height - margin);
  }
  top = Math.max(margin, top);

  return { top, left };
}
