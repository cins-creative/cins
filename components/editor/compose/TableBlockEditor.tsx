"use client";

import {
  CircleHelp,
  Minus,
  PanelTop,
  Plus,
  TableCellsMerge,
  TableCellsSplit,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
  type ClipboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

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
  remapMergesInsertCol,
  remapMergesInsertRow,
  resizeAdjacentCols,
  encodeTableCellImage,
  splitMergeAt,
  tableBlockClassName,
  tableCellImageId,
  tableConfigFromData,
  visibleCellsInRow,
  type TableBlockData,
  type TableBorder,
  type TableTheme,
} from "@/lib/editor/table-block";
import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import {
  deletePostImage,
  uploadPostImageWithProgress,
} from "@/lib/files/upload-post-image";

type CellPos = { r: number; c: number };

function ToolBtn({
  title,
  active,
  danger,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active ? true : undefined}
      className={[active ? "is-active" : "", danger ? "is-danger" : ""]
        .filter(Boolean)
        .join(" ") || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BorderGlyph({ weight }: { weight: TableBorder }) {
  const h = weight === "thin" ? 1.25 : weight === "med" ? 2.25 : 3.4;
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
      <rect
        x="2"
        y={8 - h / 2}
        width="12"
        height={h}
        rx="0.7"
        fill="currentColor"
      />
    </svg>
  );
}

function EdgeBtn({
  title,
  minus,
  disabled,
  onClick,
}: {
  title: string;
  minus?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`b-table-edge-btn${minus ? " is-minus" : ""}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {minus ? (
        <Minus size={11} strokeWidth={2.4} aria-hidden />
      ) : (
        <Plus size={11} strokeWidth={2.4} aria-hidden />
      )}
    </button>
  );
}

function ThemeGlyph({ theme }: { theme: TableTheme }) {
  if (theme === "lined") {
    return (
      <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
        <path
          d="M3 5h10M3 8h10M3 11h10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (theme === "striped") {
    return (
      <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <rect x="3.2" y="6.2" width="9.6" height="3.6" fill="currentColor" opacity="0.28" />
      </svg>
    );
  }
  if (theme === "minimal") {
    return (
      <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

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
  const dataRef = useRef(data);
  dataRef.current = data;
  const [sel, setSel] = useState<CellPos | null>(null);
  const [selEnd, setSelEnd] = useState<CellPos | null>(null);
  const [imgUpload, setImgUpload] = useState<{
    r: number;
    c: number;
    preview: string;
  } | null>(null);

  function commit(patch: Partial<TableBlockData>) {
    const current = dataRef.current;
    onChange(
      tableConfigFromData({
        ...current,
        ...patch,
      }),
    );
  }

  function patchCell(rowIndex: number, colIndex: number, value: string) {
    const current = dataRef.current;
    const next = current.rows.map((row) => [...row]);
    const cols = Math.max(TABLE_MIN_COLS, ...next.map((r) => r.length));
    while (next[rowIndex].length < cols) next[rowIndex].push("");
    next[rowIndex][colIndex] = value;
    commit({ rows: next });
  }

  async function pasteImageIntoCell(
    rowIndex: number,
    colIndex: number,
    e: ClipboardEvent,
  ) {
    const file = imageFilesFromClipboard(e.clipboardData)[0];
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    selectCell(rowIndex, colIndex, false);
    if (imgUpload?.preview) URL.revokeObjectURL(imgUpload.preview);
    const replacedId = tableCellImageId(
      dataRef.current.rows[rowIndex]?.[colIndex] ?? "",
    );
    const preview = URL.createObjectURL(file);
    setImgUpload({ r: rowIndex, c: colIndex, preview });
    try {
      const { imageId } = await uploadPostImageWithProgress(file);
      patchCell(rowIndex, colIndex, encodeTableCellImage(imageId));
      if (replacedId && replacedId !== imageId) deletePostImage(replacedId);
    } catch {
      /* giữ ô cũ — user dán lại */
    } finally {
      URL.revokeObjectURL(preview);
      setImgUpload((cur) =>
        cur?.r === rowIndex && cur.c === colIndex ? null : cur,
      );
    }
  }

  function shiftSelAfterInsertRow(at: number) {
    setSel((cur) => (cur && cur.r >= at ? { ...cur, r: cur.r + 1 } : cur));
    setSelEnd((cur) => (cur && cur.r >= at ? { ...cur, r: cur.r + 1 } : cur));
  }

  function shiftSelAfterInsertCol(at: number) {
    setSel((cur) => (cur && cur.c >= at ? { ...cur, c: cur.c + 1 } : cur));
    setSelEnd((cur) => (cur && cur.c >= at ? { ...cur, c: cur.c + 1 } : cur));
  }

  function insertRowAt(at: number) {
    if (rows.length >= TABLE_MAX_ROWS) return;
    const next = [...rows];
    next.splice(at, 0, Array.from({ length: colCount }, () => ""));
    commit({
      rows: next,
      merges: remapMergesInsertRow(merges, at),
    });
    shiftSelAfterInsertRow(at);
  }

  function insertColAt(at: number) {
    if (colCount >= TABLE_MAX_COLS) return;
    const nextCols = colCount + 1;
    const nextWidths = [...colWidths];
    nextWidths.splice(at, 0, 100 / nextCols);
    commit({
      rows: rows.map((row) => {
        const next = [...row];
        next.splice(at, 0, "");
        return next;
      }),
      colWidths: normalizeColWidths(nextWidths, nextCols),
      merges: remapMergesInsertCol(merges, at),
    });
    shiftSelAfterInsertCol(at);
  }

  function removeRow(rowIndex: number) {
    if (rows.length <= TABLE_MIN_ROWS) return;
    for (const cell of rows[rowIndex] ?? []) {
      const id = tableCellImageId(cell);
      if (id) deletePostImage(id);
    }
    commit({
      rows: rows.filter((_, i) => i !== rowIndex),
      merges: remapMergesDeleteRow(merges, rowIndex),
    });
    setSel((cur) => {
      if (!cur) return cur;
      if (cur.r > rowIndex) return { ...cur, r: cur.r - 1 };
      if (cur.r === rowIndex) {
        const nextR = Math.min(rowIndex, rows.length - 2);
        return nextR < 0 ? null : { ...cur, r: nextR };
      }
      return cur;
    });
    setSelEnd((cur) => {
      if (!cur) return cur;
      if (cur.r > rowIndex) return { ...cur, r: cur.r - 1 };
      if (cur.r === rowIndex) {
        const nextR = Math.min(rowIndex, rows.length - 2);
        return nextR < 0 ? null : { ...cur, r: nextR };
      }
      return cur;
    });
  }

  function removeCol(colIndex: number) {
    if (colCount <= TABLE_MIN_COLS) return;
    for (const row of rows) {
      const id = tableCellImageId(row[colIndex] ?? "");
      if (id) deletePostImage(id);
    }
    const nextCols = colCount - 1;
    commit({
      rows: rows.map((row) => row.filter((_, i) => i !== colIndex)),
      colWidths: normalizeColWidths(
        colWidths.filter((_, i) => i !== colIndex),
        nextCols,
      ),
      merges: remapMergesDeleteCol(merges, colIndex),
    });
    setSel((cur) => {
      if (!cur) return cur;
      if (cur.c > colIndex) return { ...cur, c: cur.c - 1 };
      if (cur.c === colIndex) {
        const nextC = Math.min(colIndex, colCount - 2);
        return nextC < 0 ? null : { ...cur, c: nextC };
      }
      return cur;
    });
    setSelEnd((cur) => {
      if (!cur) return cur;
      if (cur.c > colIndex) return { ...cur, c: cur.c - 1 };
      if (cur.c === colIndex) {
        const nextC = Math.min(colIndex, colCount - 2);
        return nextC < 0 ? null : { ...cur, c: nextC };
      }
      return cur;
    });
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

    function onMove(ev: globalThis.PointerEvent) {
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

  const canAddRow = rows.length < TABLE_MAX_ROWS;
  const canAddCol = colCount < TABLE_MAX_COLS;
  const canDelRow = rows.length > TABLE_MIN_ROWS;
  const canDelCol = colCount > TABLE_MIN_COLS;

  return (
    <div
      className={tableBlockClassName(data, "b-table-editor")}
      onClick={(e) => e.stopPropagation()}
    >
      {selected ? (
        <div className="b-table-toolbar" role="toolbar" aria-label="Công cụ bảng">
          <ToolBtn
            title={header ? "Bỏ hàng tiêu đề" : "Hàng đầu là tiêu đề"}
            active={header}
            onClick={() => commit({ header: !header })}
          >
            <PanelTop size={16} strokeWidth={1.85} aria-hidden />
          </ToolBtn>
          <span className="b-table-toolbar-sep" aria-hidden />
          <ToolBtn
            title="Gộp ô — Shift+bấm để chọn vùng"
            disabled={!canMerge}
            onClick={mergeSelection}
          >
            <TableCellsMerge size={16} strokeWidth={1.85} aria-hidden />
          </ToolBtn>
          <ToolBtn
            title="Tách ô"
            disabled={!canSplit}
            onClick={splitSelection}
          >
            <TableCellsSplit size={16} strokeWidth={1.85} aria-hidden />
          </ToolBtn>
          <span className="b-table-toolbar-sep" aria-hidden />
          {TABLE_BORDERS.map((value) => (
            <ToolBtn
              key={value}
              title={`Viền ${TABLE_BORDER_LABELS[value].toLowerCase()}`}
              active={border === value}
              onClick={() => commit({ border: value as TableBorder })}
            >
              <BorderGlyph weight={value} />
            </ToolBtn>
          ))}
          <span className="b-table-toolbar-sep" aria-hidden />
          {TABLE_THEMES.map((value) => (
            <ToolBtn
              key={value}
              title={TABLE_THEME_LABELS[value]}
              active={theme === value}
              onClick={() => commit({ theme: value as TableTheme })}
            >
              <ThemeGlyph theme={value} />
            </ToolBtn>
          ))}
          <span className="b-table-toolbar-sep" aria-hidden />
          <span
            className="b-table-toolbar-help"
            title="Dán ảnh vào ô. Chọn ô để thêm/xóa hàng cột trên 4 cạnh. Shift+bấm chọn vùng."
          >
            <CircleHelp size={15} strokeWidth={1.85} aria-hidden />
          </span>
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
                  const cellText = row[cell.col] ?? "";
                  const imgId = tableCellImageId(cellText);
                  const uploading =
                    imgUpload &&
                    imgUpload.r === rowIndex &&
                    imgUpload.c === cell.col
                      ? imgUpload
                      : null;
                  const showImg = Boolean(imgId || uploading);
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
                      onPaste={(e) =>
                        pasteImageIntoCell(rowIndex, cell.col, e)
                      }
                    >
                      {showImg ? (
                        <div
                          className="b-table-cell-img-wrap"
                          tabIndex={0}
                          onFocus={() => selectCell(rowIndex, cell.col, false)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="b-table-cell-img"
                            src={
                              uploading
                                ? uploading.preview
                                : resolveImageSeedUrl(imgId ?? "", 640, 360)
                            }
                            alt=""
                            draggable={false}
                          />
                          {uploading ? (
                            <span className="b-table-cell-img-busy">
                              Đang tải…
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="b-table-cell-img-clear"
                              title="Xóa ảnh"
                              aria-label="Xóa ảnh"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (imgId) deletePostImage(imgId);
                                patchCell(rowIndex, cell.col, "");
                              }}
                            >
                              <X size={12} strokeWidth={2.2} aria-hidden />
                            </button>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={cellText}
                          placeholder=""
                          onFocus={() => selectCell(rowIndex, cell.col, false)}
                          onChange={(e) =>
                            patchCell(rowIndex, cell.col, e.target.value)
                          }
                          onPaste={(e) =>
                            pasteImageIntoCell(rowIndex, cell.col, e)
                          }
                        />
                      )}
                      {selected &&
                      sel &&
                      rowIndex === sel.r &&
                      cell.col === sel.c ? (
                        <div className="b-table-edge-handles">
                          <div className="b-table-edge-btns b-table-edge-btns--top">
                            <EdgeBtn
                              title="Thêm hàng phía trên"
                              disabled={!canAddRow}
                              onClick={() => insertRowAt(rowIndex)}
                            />
                            <EdgeBtn
                              title="Xoá hàng này"
                              minus
                              disabled={!canDelRow}
                              onClick={() => removeRow(rowIndex)}
                            />
                          </div>
                          <div className="b-table-edge-btns b-table-edge-btns--bottom">
                            <EdgeBtn
                              title="Thêm hàng phía dưới"
                              disabled={!canAddRow}
                              onClick={() => insertRowAt(rowIndex + cell.rowspan)}
                            />
                            <EdgeBtn
                              title="Xoá hàng này"
                              minus
                              disabled={!canDelRow}
                              onClick={() => removeRow(rowIndex)}
                            />
                          </div>
                          <div className="b-table-edge-btns b-table-edge-btns--left">
                            <EdgeBtn
                              title="Thêm cột bên trái"
                              disabled={!canAddCol}
                              onClick={() => insertColAt(cell.col)}
                            />
                            <EdgeBtn
                              title="Xoá cột này"
                              minus
                              disabled={!canDelCol}
                              onClick={() => removeCol(cell.col)}
                            />
                          </div>
                          <div className="b-table-edge-btns b-table-edge-btns--right">
                            <EdgeBtn
                              title="Thêm cột bên phải"
                              disabled={!canAddCol}
                              onClick={() =>
                                insertColAt(cell.col + cell.colspan)
                              }
                            />
                            <EdgeBtn
                              title="Xoá cột này"
                              minus
                              disabled={!canDelCol}
                              onClick={() => removeCol(cell.col)}
                            />
                          </div>
                        </div>
                      ) : null}
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
    </div>
  );
}
