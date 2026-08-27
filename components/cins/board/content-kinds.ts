/**
 * Sticky «đặc biệt» trên canvas: bảng & nét vẽ tự do.
 * Lưu trong `layout.contentKind` + JSON ở `noiDung` (không thêm loai DB).
 */

export type BoardContentKind = "table" | "draw" | "comment";

export type CanvasTableData = {
  r: number;
  c: number;
  cells: string[][];
  /** Cột đầu là header dọc (nhãn hàng). */
  headerCol?: boolean;
  /** Hàng đầu là header ngang (nhãn cột). */
  headerRow?: boolean;
};

export type CanvasDrawData = {
  /** Màu nét (hex). */
  color: string;
  /** Độ dày nét (page units). */
  width: number;
  /** Điểm local trong bbox node (0…w / 0…h). */
  points: Array<{ x: number; y: number }>;
};

/** Xanh logo CINS — mặc định nét vẽ. */
export const CINS_INK_COLOR = "#1F74C9";

export const INK_PALETTE = [
  CINS_INK_COLOR,
  "#1a1a1a",
  "#dc2626",
  "#16a34a",
  "#ea580c",
] as const;

export const DRAW_WIDTH_PRESETS = [2, 4, 8] as const;

export const DEFAULT_DRAW_WIDTH = 4;

export function normalizeDrawWidth(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(24, Math.max(1, value));
  }
  return DEFAULT_DRAW_WIDTH;
}

export function normalizeContentKind(
  value: string | null | undefined,
): BoardContentKind | null {
  if (value === "table" || value === "draw" || value === "comment") return value;
  return null;
}

export function createEmptyTable(rows = 3, cols = 3): CanvasTableData {
  const r = Math.min(12, Math.max(1, Math.floor(rows)));
  const c = Math.min(12, Math.max(1, Math.floor(cols)));
  return {
    r,
    c,
    cells: Array.from({ length: r }, () =>
      Array.from({ length: c }, () => ""),
    ),
  };
}

export const TABLE_MAX_DIM = 12;
export const TABLE_CELL_MIN_W = 72;
export const TABLE_CELL_MIN_H = 32;
/** Chrome edit nằm ngoài node — không cộng vào chiều cao bảng. */
export const TABLE_CHROME_H = 0;

function withHeaderMeta(
  data: CanvasTableData,
  next: Pick<CanvasTableData, "r" | "c" | "cells">,
): CanvasTableData {
  return {
    ...next,
    ...(data.headerCol ? { headerCol: true } : {}),
    ...(data.headerRow ? { headerRow: true } : {}),
  };
}

export function addTableRow(data: CanvasTableData): CanvasTableData | null {
  if (data.r >= TABLE_MAX_DIM) return null;
  return withHeaderMeta(data, {
    r: data.r + 1,
    c: data.c,
    cells: [...data.cells.map((row) => [...row]), Array(data.c).fill("")],
  });
}

export function addTableCol(data: CanvasTableData): CanvasTableData | null {
  if (data.c >= TABLE_MAX_DIM) return null;
  return withHeaderMeta(data, {
    r: data.r,
    c: data.c + 1,
    cells: data.cells.map((row) => [...row, ""]),
  });
}

export function removeTableRow(data: CanvasTableData): CanvasTableData | null {
  if (data.r <= 1) return null;
  return withHeaderMeta(data, {
    r: data.r - 1,
    c: data.c,
    cells: data.cells.slice(0, -1).map((row) => [...row]),
  });
}

export function removeTableCol(data: CanvasTableData): CanvasTableData | null {
  if (data.c <= 1) return null;
  return withHeaderMeta(data, {
    r: data.r,
    c: data.c - 1,
    cells: data.cells.map((row) => row.slice(0, -1)),
  });
}

function clampIndex(value: number, maxExclusive: number): number {
  return Math.max(0, Math.min(maxExclusive - 1, Math.floor(value)));
}

/** Chèn hàng trống ngay sau `afterIndex` (−1 = đầu bảng). */
export function insertTableRowAfter(
  data: CanvasTableData,
  afterIndex: number,
): CanvasTableData | null {
  if (data.r >= TABLE_MAX_DIM) return null;
  const insertAt = Math.max(0, Math.min(data.r, Math.floor(afterIndex) + 1));
  const cells = data.cells.map((row) => [...row]);
  cells.splice(insertAt, 0, Array(data.c).fill(""));
  return withHeaderMeta(data, { r: data.r + 1, c: data.c, cells });
}

/** Chèn cột trống ngay sau `afterIndex` (−1 = đầu bảng). */
export function insertTableColAfter(
  data: CanvasTableData,
  afterIndex: number,
): CanvasTableData | null {
  if (data.c >= TABLE_MAX_DIM) return null;
  const insertAt = Math.max(0, Math.min(data.c, Math.floor(afterIndex) + 1));
  return withHeaderMeta(data, {
    r: data.r,
    c: data.c + 1,
    cells: data.cells.map((row) => {
      const next = [...row];
      next.splice(insertAt, 0, "");
      return next;
    }),
  });
}

/** Xóa hàng tại index — gỡ cờ header ngang nếu xóa hàng đầu. */
export function removeTableRowAt(
  data: CanvasTableData,
  index: number,
): CanvasTableData | null {
  if (data.r <= 1) return null;
  const i = clampIndex(index, data.r);
  return {
    r: data.r - 1,
    c: data.c,
    cells: data.cells.filter((_, idx) => idx !== i).map((row) => [...row]),
    ...(data.headerCol ? { headerCol: true } : {}),
    ...(data.headerRow && i !== 0 ? { headerRow: true } : {}),
  };
}

/** Xóa cột tại index — gỡ cờ header dọc nếu xóa cột đầu. */
export function removeTableColAt(
  data: CanvasTableData,
  index: number,
): CanvasTableData | null {
  if (data.c <= 1) return null;
  const i = clampIndex(index, data.c);
  return {
    r: data.r,
    c: data.c - 1,
    cells: data.cells.map((row) => row.filter((_, idx) => idx !== i)),
    ...(data.headerRow ? { headerRow: true } : {}),
    ...(data.headerCol && i !== 0 ? { headerCol: true } : {}),
  };
}

/** Chèn cột header dọc ở đầu — một lần. */
export function addTableHeaderCol(data: CanvasTableData): CanvasTableData | null {
  if (data.headerCol || data.c >= TABLE_MAX_DIM) return null;
  return {
    r: data.r,
    c: data.c + 1,
    headerCol: true,
    ...(data.headerRow ? { headerRow: true } : {}),
    cells: data.cells.map((row) => ["", ...row]),
  };
}

/** Gỡ cột header dọc (cột đầu). */
export function removeTableHeaderCol(
  data: CanvasTableData,
): CanvasTableData | null {
  if (!data.headerCol || data.c <= 1) return null;
  return {
    r: data.r,
    c: data.c - 1,
    ...(data.headerRow ? { headerRow: true } : {}),
    cells: data.cells.map((row) => row.slice(1)),
  };
}

/** Chèn hàng header ngang ở đầu — một lần. */
export function addTableHeaderRow(data: CanvasTableData): CanvasTableData | null {
  if (data.headerRow || data.r >= TABLE_MAX_DIM) return null;
  return {
    r: data.r + 1,
    c: data.c,
    headerRow: true,
    ...(data.headerCol ? { headerCol: true } : {}),
    cells: [Array(data.c).fill(""), ...data.cells.map((row) => [...row])],
  };
}

/** Gỡ hàng header ngang (hàng đầu). */
export function removeTableHeaderRow(
  data: CanvasTableData,
): CanvasTableData | null {
  if (!data.headerRow || data.r <= 1) return null;
  return {
    r: data.r - 1,
    c: data.c,
    ...(data.headerCol ? { headerCol: true } : {}),
    cells: data.cells.slice(1).map((row) => [...row]),
  };
}

/** Gợi ý kích thước node theo số hàng/cột. */
export function suggestTableSize(
  data: CanvasTableData,
  current?: { w?: number; h?: number },
): { w: number; h: number } {
  const minW = Math.max(160, data.c * TABLE_CELL_MIN_W);
  const minH = Math.max(80, data.r * TABLE_CELL_MIN_H + TABLE_CHROME_H);
  return {
    w: Math.max(current?.w ?? 0, minW),
    h: Math.max(current?.h ?? 0, minH),
  };
}

export function serializeTable(data: CanvasTableData): string {
  return JSON.stringify(data);
}

export function parseTable(raw: string | null | undefined): CanvasTableData | null {
  if (!raw?.trim()) return null;
  try {
    const obj = JSON.parse(raw) as Partial<CanvasTableData>;
    if (
      typeof obj.r !== "number" ||
      typeof obj.c !== "number" ||
      !Array.isArray(obj.cells)
    ) {
      return null;
    }
    const r = Math.min(12, Math.max(1, Math.floor(obj.r)));
    const c = Math.min(12, Math.max(1, Math.floor(obj.c)));
    const cells: string[][] = [];
    for (let i = 0; i < r; i++) {
      const row = Array.isArray(obj.cells[i]) ? obj.cells[i]! : [];
      cells.push(
        Array.from({ length: c }, (_, j) =>
          typeof row[j] === "string" ? row[j]! : "",
        ),
      );
    }
    return {
      r,
      c,
      cells,
      headerCol: obj.headerCol === true,
      headerRow: obj.headerRow === true,
    };
  } catch {
    return null;
  }
}

export function serializeDraw(data: CanvasDrawData): string {
  return JSON.stringify(data);
}

export function parseDraw(raw: string | null | undefined): CanvasDrawData | null {
  if (!raw?.trim()) return null;
  try {
    const obj = JSON.parse(raw) as Partial<CanvasDrawData>;
    if (!Array.isArray(obj.points) || obj.points.length < 2) return null;
    const points: Array<{ x: number; y: number }> = [];
    for (const p of obj.points) {
      if (!p || typeof p !== "object") continue;
      const pt = p as { x?: unknown; y?: unknown };
      if (
        typeof pt.x === "number" &&
        Number.isFinite(pt.x) &&
        typeof pt.y === "number" &&
        Number.isFinite(pt.y)
      ) {
        points.push({ x: pt.x, y: pt.y });
      }
    }
    if (points.length < 2) return null;
    return {
      color:
        typeof obj.color === "string" && obj.color.trim()
          ? obj.color.trim()
          : CINS_INK_COLOR,
      width: normalizeDrawWidth(
        typeof obj.width === "number" ? obj.width : undefined,
      ),
      points,
    };
  } catch {
    return null;
  }
}

/** Rút gọn điểm theo khoảng cách tối thiểu (page units). */
export function simplifyStroke(
  points: Array<{ x: number; y: number }>,
  minDist = 1,
): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;
  const out: Array<{ x: number; y: number }> = [points[0]!];
  let last = points[0]!;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    if (Math.hypot(p.x - last.x, p.y - last.y) >= minDist) {
      out.push(p);
      last = p;
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

function fmtPathCoord(n: number): string {
  return n.toFixed(2);
}

/** Gom điểm từ pointermove — dùng coalesced events khi vẽ nhanh. */
export function appendStrokePoints(
  points: Array<{ x: number; y: number }>,
  clientEvents: Array<{ clientX: number; clientY: number }>,
  toPage: (clientX: number, clientY: number) => { x: number; y: number },
  minDist = 0.6,
): Array<{ x: number; y: number }> {
  const out = points.slice();
  for (const ev of clientEvents) {
    const p = toPage(ev.clientX, ev.clientY);
    const last = out[out.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < minDist) continue;
    out.push(p);
  }
  return out;
}

export function pointsToSvgPath(
  points: Array<{ x: number; y: number }>,
): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) {
    const p = points[0]!;
    return `M ${fmtPathCoord(p.x)} ${fmtPathCoord(p.y)}`;
  }
  if (n === 2) {
    return (
      `M ${fmtPathCoord(points[0]!.x)} ${fmtPathCoord(points[0]!.y)}` +
      ` L ${fmtPathCoord(points[1]!.x)} ${fmtPathCoord(points[1]!.y)}`
    );
  }
  let d = `M ${fmtPathCoord(points[0]!.x)} ${fmtPathCoord(points[0]!.y)}`;
  for (let i = 1; i < n - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    d +=
      ` Q ${fmtPathCoord(p.x)} ${fmtPathCoord(p.y)}` +
      ` ${fmtPathCoord((p.x + q.x) / 2)} ${fmtPathCoord((p.y + q.y) / 2)}`;
  }
  const last = points[n - 1]!;
  d += ` L ${fmtPathCoord(last.x)} ${fmtPathCoord(last.y)}`;
  return d;
}
