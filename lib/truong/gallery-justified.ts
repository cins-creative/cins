/** Flickr-style justified rows — cùng chiều cao trong một hàng, căn full width. */

export type JustifiedInput = {
  id: string;
  aspectRatio: number;
};

export type JustifiedPlacedItem = {
  id: string;
  width: number;
  height: number;
};

export type JustifiedRow = {
  height: number;
  items: JustifiedPlacedItem[];
};

export function computeJustifiedRows(
  items: JustifiedInput[],
  containerWidth: number,
  options?: {
    gap?: number;
    targetRowHeight?: number;
    maxRowHeight?: number;
  },
): JustifiedRow[] {
  const gap = options?.gap ?? 6;
  const targetH = options?.targetRowHeight ?? 160;
  const maxH = options?.maxRowHeight ?? 280;

  if (!items.length || containerWidth <= 0) return [];

  const rows: JustifiedRow[] = [];
  let row: JustifiedInput[] = [];
  let sumAspect = 0;

  function flushRow(lastRow: boolean) {
    if (!row.length) return;
    const gaps = gap * (row.length - 1);
    let h = (containerWidth - gaps) / sumAspect;
    if (!lastRow) {
      h = Math.min(maxH, Math.max(72, h));
    } else {
      h = Math.min(maxH, Math.max(72, h));
    }
    const itemsPlaced: JustifiedPlacedItem[] = row.map((item) => {
      const w = h * item.aspectRatio;
      return { id: item.id, width: w, height: h };
    });
    const rowW =
      itemsPlaced.reduce((s, it) => s + it.width, 0) + gaps;
    const scale = lastRow && rowW > 0 ? Math.min(1, containerWidth / rowW) : 1;
    rows.push({
      height: h * scale,
      items: itemsPlaced.map((it) => ({
        id: it.id,
        width: it.width * scale,
        height: it.height * scale,
      })),
    });
    row = [];
    sumAspect = 0;
  }

  for (const item of items) {
    const ar = item.aspectRatio > 0 ? item.aspectRatio : 1;
    row.push({ ...item, aspectRatio: ar });
    sumAspect += ar;
    const gaps = gap * (row.length - 1);
    const h = (containerWidth - gaps) / sumAspect;
    if (h <= targetH) {
      flushRow(false);
    }
  }
  if (row.length) flushRow(true);

  return rows;
}
