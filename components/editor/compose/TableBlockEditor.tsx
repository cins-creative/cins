"use client";

import { useRef, useState, type PointerEvent } from "react";

import {
  TABLE_BORDER_LABELS,
  TABLE_BORDERS,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS,
  TABLE_MIN_COLS,
  TABLE_MIN_ROWS,
  TABLE_THEME_LABELS,
  TABLE_THEMES,
  applyMerge,
  canMergeRange,
  equalColWidths,
  findCoveringMerge,
  joinMergedTexts,
  normalizeColWidths,
  remapMergesDeleteCol,
  remapMergesDeleteRow,
  resizeAdjacentCols,
  splitMergeAt,
  tableBlockClassName,
  tableConfigFromData,
  visibleCellsInRow,
  type TableBlockData,
  type TableBorder,
  type TableTheme,
} from "@/lib/editor/table-block";

type CellPos = { r: number; c: number };

type Props = {
  data: TableBlockData;
  selected: boolean;
  onChange: (next: TableBlockData) => void;
};

export function TableBlockEditor({ data: raw, selected, onChange }: Props) {
  const data = tableConfigFromData(raw);
  const { rows, header, colWidths, merges, theme, border } = data;
  const colCount = Math.max(TABLE_MIN_COLS, ...rows.map((r) => r.length));
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [sel, setSel] = useState<CellPos | null>(null);
  const [selEnd, setSelEnd] = useState<CellPos | null>(null);

  function commit(patch: Partial<TableBlockData>) {
    onChange(
      tableConfigFromData({
        ...data,
        ...patch,
      }),
    );
  }

  function patchCell(rowIndex: number, colIndex: number, value: string) {
    const next = rows.map((row) => [...row]);
    while (next[rowIndex].length < colCount) next[rowIndex].push("");
    next[rowIndex][colIndex] = value;
    commit({ rows: next });
  }

  function addRow() {
    if (rows.length >= TABLE_MAX_ROWS) return;
    commit({
      rows: [...rows, Array.from({ length: colCount }, () => "")],
    });
  }

  function addCol() {
    if (colCount >= TABLE_MAX_COLS) return;
    const nextCols = colCount + 1;
    commit({
      rows: rows.map((row) => [...row, ""]),
      colWidths: normalizeColWidths(
        [...colWidths, 100 / nextCols],
        nextCols,
      ),
    });
  }

  function removeRow(rowIndex: number) {
    if (rows.length <= TABLE_MIN_ROWS) return;
    commit({
      rows: rows.filter((_, i) => i !== rowIndex),
      merges: remapMergesDeleteRow(merges, rowIndex),
    });
    setSel(null);
    setSelEnd(null);
  }

  function removeCol(colIndex: number) {
    if (colCount <= TABLE_MIN_COLS) return;
    const nextCols = colCount - 1;
    commit({
      rows: rows.map((row) => row.filter((_, i) => i !== colIndex)),
      colWidths: normalizeColWidths(
        colWidths.filter((_, i) => i !== colIndex),
        nextCols,
      ),
      merges: remapMergesDeleteCol(merges, colIndex),
    });
    setSel(null);
    setSelEnd(null);
  }

  function selectCell(r: number, c: number, shift: boolean) {
    if (!selected) return;
    if (shift && sel) {
      setSelEnd({ r, c });
      return;
    }
    setSel({ r, c });
    setSelEnd({ r, c });
  }

  const range = sel && selEnd ? { a: sel, b: selEnd } : null;
  const canMerge = range
    ? canMergeRange(merges, range.a.r, range.a.c, range.b.r, range.b.c)
    : false;
  const covering = sel ? findCoveringMerge(merges, sel.r, sel.c) : null;
  const canSplit = Boolean(
    covering && (covering.rowspan > 1 || covering.colspan > 1),
  );

  function mergeSelection() {
    if (!range || !canMerge) return;
    commit({
      rows: joinMergedTexts(rows, range.a.r, range.a.c, range.b.r, range.b.c),
      merges: applyMerge(merges, range.a.r, range.a.c, range.b.r, range.b.c),
    });
  }

  function splitSelection() {
    if (!sel || !canSplit) return;
    commit({ merges: splitMergeAt(merges, sel.r, sel.c) });
  }

  function isSelectedCell(r: number, c: number): boolean {
    if (!range) return false;
    const rMin = Math.min(range.a.r, range.b.r);
    const rMax = Math.max(range.a.r, range.b.r);
    const cMin = Math.min(range.a.c, range.b.c);
    const cMax = Math.max(range.a.c, range.b.c);
    return r >= rMin && r <= rMax && c >= cMin && c <= cMax;
  }

  function onResizeStart(leftCol: number, event: PointerEvent<HTMLSpanElement>) {
    if (!selected || leftCol >= colCount - 1) return;
    event.preventDefault();
    event.stopPropagation();
    const table = tableRef.current;
    if (!table) return;
    const startX = event.clientX;
    const startWidths = [...colWidths];
    const tableW = table.getBoundingClientRect().width || 1;

    function onMove(ev: PointerEvent) {
      const deltaPct = ((ev.clientX - startX) / tableW) * 100;
      commit({
        colWidths: resizeAdjacentCols(startWidths, leftCol, deltaPct),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const activeRow = sel?.r ?? rows.length - 1;
  const activeCol = sel?.c ?? colCount - 1;

  return (
    <div
      className={tableBlockClassName(data, "b-table-editor")}
      onClick={(e) => e.stopPropagation()}
    >
      {selected ? (
        <div className="b-table-toolbar">
          <label className="b-table-header-toggle">
            <input
              type="checkbox"
              checked={header}
              onChange={(e) => commit({ header: e.target.checked })}
            />
            Hàng đầu là tiêu đề
          </label>
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= TABLE_MAX_ROWS}
          >
            + Hàng
          </button>
          <button
            type="button"
            onClick={addCol}
            disabled={colCount >= TABLE_MAX_COLS}
          >
            + Cột
          </button>
          <button type="button" onClick={mergeSelection} disabled={!canMerge}>
            Gộp ô
          </button>
          <button type="button" onClick={splitSelection} disabled={!canSplit}>
            Tách ô
          </button>
          <button
            type="button"
            onClick={() => removeRow(activeRow)}
            disabled={rows.length <= TABLE_MIN_ROWS}
          >
            Xoá hàng
          </button>
          <button
            type="button"
            onClick={() => removeCol(activeCol)}
            disabled={colCount <= TABLE_MIN_COLS}
          >
            Xoá cột
          </button>
          <span className="b-table-toolbar-lbl">Viền</span>
          {TABLE_BORDERS.map((value) => (
            <button
              key={value}
              type="button"
              className={border === value ? "is-active" : undefined}
              onClick={() => commit({ border: value as TableBorder })}
            >
              {TABLE_BORDER_LABELS[value]}
            </button>
          ))}
          <span className="b-table-toolbar-lbl">Kiểu</span>
          {TABLE_THEMES.map((value) => (
            <button
              key={value}
              type="button"
              className={theme === value ? "is-active" : undefined}
              onClick={() => commit({ theme: value as TableTheme })}
            >
              {TABLE_THEME_LABELS[value]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="b-table-scroll">
        <table ref={tableRef}>
          <colgroup>
            {(colWidths.length === colCount
              ? colWidths
              : equalColWidths(colCount)
            ).map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  header && rowIndex === 0 ? "is-header-row" : "is-body-row"
                }
              >
                {visibleCellsInRow(rows, merges, rowIndex).map((cell) => {
                  const isHeader = header && rowIndex === 0;
                  const Tag = isHeader ? "th" : "td";
                  return (
                    <Tag
                      key={`${rowIndex}-${cell.col}`}
                      colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                      rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                      className={
                        selected && isSelectedCell(rowIndex, cell.col)
                          ? "is-selected"
                          : undefined
                      }
                      onClick={(e) =>
                        selectCell(rowIndex, cell.col, e.shiftKey)
                      }
                    >
                      <input
                        type="text"
                        value={row[cell.col] ?? ""}
                        placeholder={isHeader ? "Tiêu đề" : "Nội dung"}
                        onFocus={() => selectCell(rowIndex, cell.col, false)}
                        onChange={(e) =>
                          patchCell(rowIndex, cell.col, e.target.value)
                        }
                      />
                      {selected &&
                      rowIndex === 0 &&
                      cell.col + cell.colspan - 1 < colCount - 1 ? (
                        <span
                          className="b-table-col-resizer"
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Kéo tỉ lệ cột ${cell.col + 1}`}
                          onPointerDown={(e) =>
                            onResizeStart(cell.col + cell.colspan - 1, e)
                          }
                        />
                      ) : null}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <p className="b-table-hint">
          Bấm ô rồi Shift+bấm ô khác để chọn vùng · kéo cạnh cột để đổi tỉ lệ
        </p>
      ) : null}
    </div>
  );
}
