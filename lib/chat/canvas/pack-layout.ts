import type { CanvasNodeLayout } from "@/lib/chat/canvas/types";

/** Lưới ảnh mới gửi lên canvas — không đụng node user đã kéo. */
export const CANVAS_PACK_COLS = 4;
export const CANVAS_PACK_CELL_W = 260;
export const CANVAS_PACK_CELL_H = 210;
export const CANVAS_PACK_GAP = 24;

export type PackRect = { x: number; y: number; w: number; h: number };

export function layoutToPackRect(layout: {
  x: number;
  y: number;
  w?: number;
  h?: number;
}): PackRect {
  return {
    x: layout.x,
    y: layout.y,
    w: layout.w && layout.w > 0 ? layout.w : CANVAS_PACK_CELL_W,
    h: layout.h && layout.h > 0 ? layout.h : CANVAS_PACK_CELL_H,
  };
}

function overlaps(a: PackRect, b: PackRect, pad = 12): boolean {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

/** Ô lưới trống tiếp theo — không đè lên `occupied` (node đã có, kể cả user kéo). */
export function nextPackedLayout(
  occupied: PackRect[],
  size: { w: number; h: number },
  z: number,
): CanvasNodeLayout {
  const stepX = CANVAS_PACK_CELL_W + CANVAS_PACK_GAP;
  const stepY = CANVAS_PACK_CELL_H + CANVAS_PACK_GAP;
  const w = size.w > 0 ? size.w : CANVAS_PACK_CELL_W;
  const h = size.h > 0 ? size.h : CANVAS_PACK_CELL_H;
  const maxSlots = CANVAS_PACK_COLS * 80;

  for (let i = 0; i < maxSlots; i++) {
    const col = i % CANVAS_PACK_COLS;
    const row = Math.floor(i / CANVAS_PACK_COLS);
    const candidate: PackRect = {
      x: col * stepX,
      y: row * stepY,
      w,
      h,
    };
    if (!occupied.some((o) => overlaps(candidate, o))) {
      return { x: candidate.x, y: candidate.y, w, h, z };
    }
  }

  const y =
    occupied.reduce((max, o) => Math.max(max, o.y + o.h), 0) + CANVAS_PACK_GAP;
  return { x: 0, y, w, h, z };
}

export function occupiedRectsFromNodes(
  nodes: Array<{ loai?: string | null; layout: unknown }>,
): PackRect[] {
  const rects: PackRect[] = [];
  for (const node of nodes) {
    if (node.loai === "connector") continue;
    const raw = node.layout;
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    const x = typeof obj.x === "number" && Number.isFinite(obj.x) ? obj.x : null;
    const y = typeof obj.y === "number" && Number.isFinite(obj.y) ? obj.y : null;
    if (x == null || y == null) continue;
    rects.push(
      layoutToPackRect({
        x,
        y,
        w: typeof obj.w === "number" ? obj.w : undefined,
        h: typeof obj.h === "number" ? obj.h : undefined,
      }),
    );
  }
  return rects;
}

export function maxLayoutZ(
  nodes: Array<{ layout: unknown }>,
): number {
  let z = 0;
  for (const node of nodes) {
    const raw = node.layout;
    if (!raw || typeof raw !== "object") continue;
    const val = (raw as Record<string, unknown>).z;
    if (typeof val === "number" && Number.isFinite(val)) {
      z = Math.max(z, val);
    }
  }
  return z;
}
