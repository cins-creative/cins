/**
 * Sticky «đặc biệt» trên canvas: bảng & nét vẽ tự do.
 * Lưu trong `layout.contentKind` + JSON ở `noiDung` (không thêm loai DB).
 */

export type BoardContentKind = "table" | "draw" | "comment";

export type CanvasTableData = {
  r: number;
  c: number;
  cells: string[][];
};

export type CanvasDrawData = {
  /** Màu nét (hex). */
  color: string;
  /** Độ dày nét (page units). */
  width: number;
  /** Điểm local trong bbox node (0…w / 0…h). */
  points: Array<{ x: number; y: number }>;
};

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
/** Thanh kéo + toolbar thêm hàng/cột. */
export const TABLE_CHROME_H = 56;

export function addTableRow(data: CanvasTableData): CanvasTableData | null {
  if (data.r >= TABLE_MAX_DIM) return null;
  return {
    r: data.r + 1,
    c: data.c,
    cells: [...data.cells.map((row) => [...row]), Array(data.c).fill("")],
  };
}

export function addTableCol(data: CanvasTableData): CanvasTableData | null {
  if (data.c >= TABLE_MAX_DIM) return null;
  return {
    r: data.r,
    c: data.c + 1,
    cells: data.cells.map((row) => [...row, ""]),
  };
}

export function removeTableRow(data: CanvasTableData): CanvasTableData | null {
  if (data.r <= 1) return null;
  return {
    r: data.r - 1,
    c: data.c,
    cells: data.cells.slice(0, -1).map((row) => [...row]),
  };
}

export function removeTableCol(data: CanvasTableData): CanvasTableData | null {
  if (data.c <= 1) return null;
  return {
    r: data.r,
    c: data.c - 1,
    cells: data.cells.map((row) => row.slice(0, -1)),
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
    return { r, c, cells };
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
          : "#1a1a1a",
      width:
        typeof obj.width === "number" && Number.isFinite(obj.width)
          ? Math.min(24, Math.max(1, obj.width))
          : 2.5,
      points,
    };
  } catch {
    return null;
  }
}

/** Rút gọn điểm theo khoảng cách tối thiểu (page units). */
export function simplifyStroke(
  points: Array<{ x: number; y: number }>,
  minDist = 1.5,
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

export function pointsToSvgPath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) return "";
  let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x.toFixed(1)} ${points[i]!.y.toFixed(1)}`;
  }
  return d;
}
