"use client";

import { AutosizeTextarea } from "@/components/editor/compose/AutosizeTextarea";
import type { ArticleComposeBlock } from "@/lib/article/compose/types";

type BlockPatch = Partial<ArticleComposeBlock>;

type Props = {
  block: ArticleComposeBlock;
  selected: boolean;
  onSelect: () => void;
  onPatch: (patch: BlockPatch) => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
};

export function ArticleComposeBlockRow({
  block: b,
  selected,
  onSelect,
  onPatch,
  onUp,
  onDown,
  onDelete,
}: Props) {
  return (
    <div
      className={`block${selected ? " selected" : ""}`}
      data-block-type={b.t}
      onClick={onSelect}
    >
      <div className="block-side">
        <button
          type="button"
          className="side-btn"
          onClick={(e) => {
            e.stopPropagation();
            onUp();
          }}
          title="Lên"
          aria-label="Di chuyển lên"
        >
          ▲
        </button>
        <button
          type="button"
          className="side-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDown();
          }}
          title="Xuống"
          aria-label="Di chuyển xuống"
        >
          ▼
        </button>
        <button
          type="button"
          className="side-btn del"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Xoá block"
          aria-label="Xoá"
        >
          ✕
        </button>
      </div>
      <div className="block-inner">
        <ComposeBlockInner block={b} selected={selected} onPatch={onPatch} />
      </div>
    </div>
  );
}

function ComposeBlockInner({
  block: b,
  selected,
  onPatch,
}: {
  block: ArticleComposeBlock;
  selected: boolean;
  onPatch: (patch: BlockPatch) => void;
}) {
  if (b.t === "h2" || b.t === "h3" || b.t === "body") {
    const cls =
      b.t === "h2" ? "b-text h2" : b.t === "h3" ? "b-text h3" : "b-text";
    const placeholder =
      b.t === "h2"
        ? "Tiêu đề lớn…"
        : b.t === "h3"
          ? "Tiêu đề nhỏ…"
          : "Viết gì đó…";
    return (
      <AutosizeTextarea
        className={cls}
        placeholder={placeholder}
        value={b.text ?? ""}
        onChange={(text) => onPatch({ text })}
      />
    );
  }

  if (b.t === "quote") {
    return (
      <div className="b-quote">
        <AutosizeTextarea
          placeholder="Trích dẫn nổi bật…"
          value={b.text ?? ""}
          onChange={(text) => onPatch({ text })}
        />
      </div>
    );
  }

  if (b.t === "list-ul" || b.t === "list-ol") {
    const lines = (b.items ?? [""]).join("\n");
    return (
      <div className="b-list">
        {selected ? (
          <div
            className="b-list-ctrl"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Kiểu danh sách"
          >
            <button
              type="button"
              className={b.t === "list-ul" ? "active" : ""}
              onClick={() => onPatch({ t: "list-ul" })}
            >
              • Gạch đầu dòng
            </button>
            <button
              type="button"
              className={b.t === "list-ol" ? "active" : ""}
              onClick={() => onPatch({ t: "list-ol" })}
            >
              1. Đánh số
            </button>
          </div>
        ) : null}
        <AutosizeTextarea
          className="b-list-input"
          placeholder="Mỗi dòng là một mục…"
          value={lines}
          onChange={(raw) => {
            const items = raw.split("\n");
            onPatch({ items });
          }}
        />
      </div>
    );
  }

  if (b.t === "table") {
    const rows = b.tableRows ?? [[""]];
    const colCount = Math.max(1, ...rows.map((r) => r.length));

    function patchCell(rowIndex: number, colIndex: number, value: string) {
      const next = rows.map((row) => [...row]);
      while (next[rowIndex].length < colCount) next[rowIndex].push("");
      next[rowIndex][colIndex] = value;
      onPatch({ tableRows: next });
    }

    function addRow() {
      onPatch({
        tableRows: [...rows, Array.from({ length: colCount }, () => "")],
      });
    }

    function addCol() {
      onPatch({
        tableRows: rows.map((row) => [...row, ""]),
      });
    }

    function removeRow(rowIndex: number) {
      if (rows.length <= 1) return;
      onPatch({ tableRows: rows.filter((_, i) => i !== rowIndex) });
    }

    function removeCol(colIndex: number) {
      if (colCount <= 1) return;
      onPatch({
        tableRows: rows.map((row) => row.filter((_, i) => i !== colIndex)),
      });
    }

    return (
      <div className="b-table" onClick={(e) => e.stopPropagation()}>
        {selected ? (
          <div className="b-table-toolbar">
            <label className="b-table-header-toggle">
              <input
                type="checkbox"
                checked={b.tableHeader !== false}
                onChange={(e) => onPatch({ tableHeader: e.target.checked })}
              />
              Hàng đầu là tiêu đề
            </label>
            <button type="button" onClick={addRow}>
              + Hàng
            </button>
            <button type="button" onClick={addCol}>
              + Cột
            </button>
          </div>
        ) : null}
        <div
          className="b-table-grid"
          style={{
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          }}
        >
          {rows.map((row, rowIndex) =>
            Array.from({ length: colCount }, (_, colIndex) => {
              const isHeader = b.tableHeader !== false && rowIndex === 0;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`b-table-cell${isHeader ? " is-header" : ""}`}
                >
                  <input
                    type="text"
                    value={row[colIndex] ?? ""}
                    placeholder={isHeader ? "Tiêu đề" : "Nội dung"}
                    onChange={(e) =>
                      patchCell(rowIndex, colIndex, e.target.value)
                    }
                  />
                  {selected && colIndex === colCount - 1 ? (
                    <button
                      type="button"
                      className="b-table-row-del"
                      aria-label="Xoá hàng"
                      onClick={() => removeRow(rowIndex)}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>
        {selected ? (
          <div className="b-table-col-actions">
            {Array.from({ length: colCount }, (_, colIndex) => (
              <button
                key={colIndex}
                type="button"
                className="b-table-col-del"
                onClick={() => removeCol(colIndex)}
                disabled={colCount <= 1}
              >
                Xoá cột {colIndex + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (b.t === "imgs") {
    return (
      <div className="b-imgs-hint" onClick={(e) => e.stopPropagation()}>
        <label>
          <span>Nhãn</span>
          <input
            type="text"
            value={b.imgLabel ?? ""}
            onChange={(e) => onPatch({ imgLabel: e.target.value })}
            placeholder="Gợi ý tìm ảnh"
          />
        </label>
        <label>
          <span>Từ khoá / mô tả ảnh</span>
          <input
            type="text"
            value={b.imgKeywords ?? ""}
            onChange={(e) => onPatch({ imgKeywords: e.target.value })}
            placeholder="ví dụ: designer làm việc với Figma"
          />
        </label>
      </div>
    );
  }

  if (b.t === "embed") {
    return (
      <div className="b-embed" onClick={(e) => e.stopPropagation()}>
        <div className="em-ic" aria-hidden>
          ▶
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="url"
            placeholder="Dán link YouTube · Vimeo · Figma · Sketchfab · Rive…"
            value={b.embedUrl ?? ""}
            onChange={(e) => onPatch({ embedUrl: e.target.value })}
          />
          <div className="em-hint">Tự động nhúng khi dán link hợp lệ.</div>
        </div>
      </div>
    );
  }

  if (b.t === "divider") {
    const len = Math.max(5, Math.min(100, b.dividerLen ?? 8));
    const thick: "thin" | "med" | "thick" =
      b.dividerThick === "thin" || b.dividerThick === "thick"
        ? b.dividerThick
        : "med";
    return (
      <div className={`b-divider thick-${thick}`}>
        <span style={{ width: `${len}%` }} />
        {selected ? (
          <div
            className="divider-ctrl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="divider-thick-pick" role="group" aria-label="Độ dày">
              {(
                [
                  { v: "thin", lbl: "Mảnh" },
                  { v: "med", lbl: "Vừa" },
                  { v: "thick", lbl: "Đậm" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={`divider-thick-btn t-${opt.v}${
                    thick === opt.v ? " active" : ""
                  }`}
                  title={opt.lbl}
                  aria-label={opt.lbl}
                  aria-pressed={thick === opt.v}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPatch({ dividerThick: opt.v });
                  }}
                >
                  <i aria-hidden />
                </button>
              ))}
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={len}
              onChange={(e) =>
                onPatch({ dividerLen: Number(e.target.value) || 8 })
              }
              aria-label="Độ dài đường chia"
            />
            <span className="divider-ctrl-val">{len}%</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (b.t === "spacer") {
    const rawSize = b.size || "m";
    const size = rawSize === "s" ? "m" : rawSize;
    return (
      <div className={`b-spacer ${size}`}>
        <div className="sp-line" />
        <div className="sp-ctrl">
          {(["m", "l"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={size === s ? "active" : ""}
              onClick={(e) => {
                e.stopPropagation();
                onPatch({ size: s });
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
