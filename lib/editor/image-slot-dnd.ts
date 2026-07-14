/** Snap target khi kéo sắp xếp ảnh (block / album grid). */
export type DragSnapTarget = {
  slot: number;
  edge: "before" | "after";
  axis: "x" | "y";
};

/** Nửa ô theo chiều dài hơn → before / after. */
export function snapFromPointer(
  e: { clientX: number; clientY: number },
  el: HTMLElement,
): Pick<DragSnapTarget, "edge" | "axis"> {
  const rect = el.getBoundingClientRect();
  const axis: "x" | "y" = rect.width >= rect.height ? "x" : "y";
  const edge =
    axis === "x"
      ? e.clientX < rect.left + rect.width / 2
        ? "before"
        : "after"
      : e.clientY < rect.top + rect.height / 2
        ? "before"
        : "after";
  return { edge, axis };
}

/**
 * Index đích sau khi `splice(from)` rồi `splice(insertAt, 0, item)`.
 * `null` = không đổi thứ tự (khe trùng vị trí hiện tại).
 */
export function insertIndexFromSnap(
  from: number,
  snap: DragSnapTarget,
): number | null {
  let insertAt = snap.edge === "before" ? snap.slot : snap.slot + 1;
  if (from < insertAt) insertAt -= 1;
  if (insertAt === from) return null;
  return insertAt;
}

export function sameDragSnap(
  a: DragSnapTarget | null,
  b: DragSnapTarget | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.slot === b.slot && a.edge === b.edge && a.axis === b.axis;
}
