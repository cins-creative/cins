/** Block `table` — config JSONB `noi_dung_blocks`. */

export const TABLE_MIN_ROWS = 1;
export const TABLE_MAX_ROWS = 20;
export const TABLE_MIN_COLS = 1;
export const TABLE_MAX_COLS = 8;
export const TABLE_CELL_MAX = 500;
export const TABLE_COL_WIDTH_MIN = 8;

export const DEFAULT_TABLE_ROWS: string[][] = [
  ["Cột 1", "Cột 2", "Cột 3"],
  ["", "", ""],
  ["", "", ""],
];

export const TABLE_THEMES = ["grid", "lined", "striped", "minimal"] as const;
export type TableTheme = (typeof TABLE_THEMES)[number];

export const TABLE_BORDERS = ["thin", "med", "thick"] as const;
export type TableBorder = (typeof TABLE_BORDERS)[number];

export const TABLE_THEME_LABELS: Record<TableTheme, string> = {
  grid: "Lưới",
  lined: "Kẻ ngang",
  striped: "Sọc",
  minimal: "Tối giản",
};

export const TABLE_BORDER_LABELS: Record<TableBorder, string> = {
  thin: "Mảnh",
  med: "Vừa",
  thick: "Đậm",
};

export type TableMerge = {
  r: number;
  c: number;
  rowspan: number;
  colspan: number;
};

export type TableBlockData = {
  rows: string[][];
  header: boolean;
  colWidths: number[];
  merges: TableMerge[];
  theme: TableTheme;
  border: TableBorder;
};

export type TableVisibleCell = {
  col: number;
  text: string;
  colspan: number;
  rowspan: number;
};

function clipCell(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, TABLE_CELL_MAX);
}

export function normalizeTableRows(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_TABLE_ROWS.map((row) => [...row]);
  }
  const rows = raw
    .slice(0, TABLE_MAX_ROWS)
    .map((row) =>
      Array.isArray(row)
        ? row.slice(0, TABLE_MAX_COLS).map(clipCell)
        : [""],
    );
  const colCount = Math.max(
    TABLE_MIN_COLS,
    ...rows.map((row) => row.length),
  );
  const cappedCols = Math.min(TABLE_MAX_COLS, colCount);
  const padded = rows.map((row) => {
    const next = row.slice(0, cappedCols);
    while (next.length < cappedCols) next.push("");
    return next;
  });
  return padded.length > 0
    ? padded
    : DEFAULT_TABLE_ROWS.map((row) => [...row]);
}

export function equalColWidths(colCount: number): number[] {
  const n = Math.max(TABLE_MIN_COLS, colCount);
  const base = Math.floor((10000 / n)) / 100;
  const widths = Array.from({ length: n }, () => base);
  const drift = 100 - widths.reduce((sum, w) => sum + w, 0);
  widths[n - 1] = Math.round((widths[n - 1] + drift) * 100) / 100;
  return widths;
}

function normalizeTo100(widths: number[]): number[] {
  const safe = widths.map((w) =>
    Number.isFinite(w) && w > 0 ? w : TABLE_COL_WIDTH_MIN,
  );
  const sum = safe.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equalColWidths(safe.length);
  const scaled = safe.map((w) => (w / sum) * 100);
  const mins = scaled.map((w) => Math.max(TABLE_COL_WIDTH_MIN, w));
  const minSum = mins.reduce((a, b) => a + b, 0);
  if (minSum > 100 + 0.01) return equalColWidths(mins.length);
  const leftover = 100 - minSum;
  const extra = scaled.map((w, i) => Math.max(0, w - mins[i]!));
  const extraSum = extra.reduce((a, b) => a + b, 0);
  const out = mins.map((w, i) =>
    extraSum > 0 ? w + (extra[i]! / extraSum) * leftover : w,
  );
  const drift = 100 - out.reduce((a, b) => a + b, 0);
  out[out.length - 1] = Math.round((out[out.length - 1]! + drift) * 100) / 100;
  return out.map((w) => Math.round(w * 100) / 100);
}

export function normalizeColWidths(
  raw: unknown,
  colCount: number,
): number[] {
  const n = Math.max(TABLE_MIN_COLS, colCount);
  if (!Array.isArray(raw) || raw.length === 0) return equalColWidths(n);
  const parsed = raw
    .slice(0, n)
    .map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0));
  while (parsed.length < n) parsed.push(100 / n);
  return normalizeTo100(parsed);
}

function parseTheme(raw: unknown): TableTheme {
  return TABLE_THEMES.includes(raw as TableTheme)
    ? (raw as TableTheme)
    : "grid";
}

function parseBorder(raw: unknown): TableBorder {
  return TABLE_BORDERS.includes(raw as TableBorder)
    ? (raw as TableBorder)
    : "med";
}

function rangesOverlap(a: TableMerge, b: TableMerge): boolean {
  return !(
    a.r + a.rowspan <= b.r ||
    b.r + b.rowspan <= a.r ||
    a.c + a.colspan <= b.c ||
    b.c + b.colspan <= a.c
  );
}

export function normalizeMerges(
  raw: unknown,
  rowCount: number,
  colCount: number,
): TableMerge[] {
  if (!Array.isArray(raw)) return [];
  const out: TableMerge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const r = typeof rec.r === "number" ? Math.floor(rec.r) : -1;
    const c = typeof rec.c === "number" ? Math.floor(rec.c) : -1;
    const rowspan =
      typeof rec.rowspan === "number" ? Math.floor(rec.rowspan) : 1;
    const colspan =
      typeof rec.colspan === "number" ? Math.floor(rec.colspan) : 1;
    if (r < 0 || c < 0 || r >= rowCount || c >= colCount) continue;
    const merge: TableMerge = {
      r,
      c,
      rowspan: Math.max(1, Math.min(rowspan, rowCount - r)),
      colspan: Math.max(1, Math.min(colspan, colCount - c)),
    };
    if (merge.rowspan === 1 && merge.colspan === 1) continue;
    if (out.some((existing) => rangesOverlap(existing, merge))) continue;
    out.push(merge);
  }
  return out;
}

export function findCoveringMerge(
  merges: TableMerge[],
  r: number,
  c: number,
): TableMerge | null {
  return (
    merges.find(
      (m) =>
        r >= m.r &&
        r < m.r + m.rowspan &&
        c >= m.c &&
        c < m.c + m.colspan,
    ) ?? null
  );
}

export function isCoveredCell(
  merges: TableMerge[],
  r: number,
  c: number,
): boolean {
  const m = findCoveringMerge(merges, r, c);
  return Boolean(m && (m.r !== r || m.c !== c));
}

export function visibleCellsInRow(
  rows: string[][],
  merges: TableMerge[],
  rowIndex: number,
): TableVisibleCell[] {
  const colCount = rows[rowIndex]?.length ?? 0;
  const out: TableVisibleCell[] = [];
  for (let c = 0; c < colCount; c += 1) {
    if (isCoveredCell(merges, rowIndex, c)) continue;
    const m = findCoveringMerge(merges, rowIndex, c);
    out.push({
      col: c,
      text: rows[rowIndex]?.[c] ?? "",
      colspan: m && m.r === rowIndex && m.c === c ? m.colspan : 1,
      rowspan: m && m.r === rowIndex && m.c === c ? m.rowspan : 1,
    });
  }
  return out;
}

export function selectionRect(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): { rMin: number; rMax: number; cMin: number; cMax: number } {
  return {
    rMin: Math.min(r1, r2),
    rMax: Math.max(r1, r2),
    cMin: Math.min(c1, c2),
    cMax: Math.max(c1, c2),
  };
}

export function canMergeRange(
  merges: TableMerge[],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  const { rMin, rMax, cMin, cMax } = selectionRect(r1, c1, r2, c2);
  if (rMin === rMax && cMin === cMax) return false;
  for (let r = rMin; r <= rMax; r += 1) {
    for (let c = cMin; c <= cMax; c += 1) {
      const covering = findCoveringMerge(merges, r, c);
      if (!covering) continue;
      if (
        covering.r < rMin ||
        covering.c < cMin ||
        covering.r + covering.rowspan - 1 > rMax ||
        covering.c + covering.colspan - 1 > cMax
      ) {
        return false;
      }
    }
  }
  return true;
}

export function applyMerge(
  merges: TableMerge[],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): TableMerge[] {
  const { rMin, rMax, cMin, cMax } = selectionRect(r1, c1, r2, c2);
  const next = merges.filter((m) => {
    const inside =
      m.r >= rMin &&
      m.c >= cMin &&
      m.r + m.rowspan - 1 <= rMax &&
      m.c + m.colspan - 1 <= cMax;
    return !inside;
  });
  next.push({
    r: rMin,
    c: cMin,
    rowspan: rMax - rMin + 1,
    colspan: cMax - cMin + 1,
  });
  return next;
}

export function joinMergedTexts(
  rows: string[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): string[][] {
  const { rMin, rMax, cMin, cMax } = selectionRect(r1, c1, r2, c2);
  const next = rows.map((row) => [...row]);
  const parts: string[] = [];
  for (let r = rMin; r <= rMax; r += 1) {
    for (let c = cMin; c <= cMax; c += 1) {
      const text = next[r]?.[c]?.trim() ?? "";
      if (text) parts.push(text);
      if (r !== rMin || c !== cMin) {
        if (next[r]) next[r][c] = "";
      }
    }
  }
  if (next[rMin]) {
    next[rMin][cMin] = parts.join(" ").slice(0, TABLE_CELL_MAX);
  }
  return next;
}

export function splitMergeAt(
  merges: TableMerge[],
  r: number,
  c: number,
): TableMerge[] {
  const covering = findCoveringMerge(merges, r, c);
  if (!covering) return merges;
  return merges.filter(
    (m) => m.r !== covering.r || m.c !== covering.c,
  );
}

export function remapMergesDeleteRow(
  merges: TableMerge[],
  rowIndex: number,
): TableMerge[] {
  const out: TableMerge[] = [];
  for (const m of merges) {
    const rEnd = m.r + m.rowspan - 1;
    if (rEnd < rowIndex) {
      out.push(m);
    } else if (m.r > rowIndex) {
      out.push({ ...m, r: m.r - 1 });
    } else {
      const nextSpan = m.rowspan - 1;
      if (nextSpan < 1) continue;
      out.push({
        ...m,
        r: m.r === rowIndex ? rowIndex : m.r,
        rowspan: nextSpan,
      });
    }
  }
  return out;
}

export function remapMergesDeleteCol(
  merges: TableMerge[],
  colIndex: number,
): TableMerge[] {
  const out: TableMerge[] = [];
  for (const m of merges) {
    const cEnd = m.c + m.colspan - 1;
    if (cEnd < colIndex) {
      out.push(m);
    } else if (m.c > colIndex) {
      out.push({ ...m, c: m.c - 1 });
    } else {
      const nextSpan = m.colspan - 1;
      if (nextSpan < 1) continue;
      out.push({
        ...m,
        c: m.c === colIndex ? colIndex : m.c,
        colspan: nextSpan,
      });
    }
  }
  return out;
}

export function resizeAdjacentCols(
  widths: number[],
  leftIndex: number,
  deltaPct: number,
): number[] {
  if (leftIndex < 0 || leftIndex >= widths.length - 1) return widths;
  const pair = widths[leftIndex]! + widths[leftIndex + 1]!;
  const left = Math.min(
    pair - TABLE_COL_WIDTH_MIN,
    Math.max(TABLE_COL_WIDTH_MIN, widths[leftIndex]! + deltaPct),
  );
  const next = [...widths];
  next[leftIndex] = Math.round(left * 100) / 100;
  next[leftIndex + 1] = Math.round((pair - left) * 100) / 100;
  return next;
}

export function parseTableConfig(
  cfg: Record<string, unknown> | null | undefined,
): TableBlockData {
  const rows = normalizeTableRows(cfg?.rows);
  const colCount = rows[0]?.length ?? TABLE_MIN_COLS;
  return {
    rows,
    header: cfg?.header !== false,
    colWidths: normalizeColWidths(cfg?.colWidths, colCount),
    merges: normalizeMerges(cfg?.merges, rows.length, colCount),
    theme: parseTheme(cfg?.theme),
    border: parseBorder(cfg?.border),
  };
}

export function tableConfigFromData(data: TableBlockData): TableBlockData {
  const rows = normalizeTableRows(data.rows);
  const colCount = rows[0]?.length ?? TABLE_MIN_COLS;
  return {
    rows,
    header: data.header !== false,
    colWidths: normalizeColWidths(data.colWidths, colCount),
    merges: normalizeMerges(data.merges, rows.length, colCount),
    theme: parseTheme(data.theme),
    border: parseBorder(data.border),
  };
}

/** Clip + pad `config` trước khi ghi DB. */
export function sanitizeTableBlockConfig(
  cfg: Record<string, unknown> | null | undefined,
): TableBlockData {
  return tableConfigFromData(parseTableConfig(cfg));
}

export function tableBlockClassName(
  data: Pick<TableBlockData, "theme" | "border">,
  extra?: string,
): string {
  return [
    "b-table",
    extra,
    `b-table--${data.theme}`,
    `b-table--border-${data.border}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Plain text cho caption / validate publish — hàng cách dòng, ô cách ` · `. */
export function tablePlainText(
  rows: string[][],
  maxChars = 500,
): string {
  const lines: string[] = [];
  for (const row of rows) {
    const cells = row.map((c) => c.trim()).filter(Boolean);
    if (cells.length) lines.push(cells.join(" · "));
  }
  return lines.join("\n").slice(0, maxChars);
}
