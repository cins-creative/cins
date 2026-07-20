"use client";

/**
 * Render một node trên board — ảnh / link (OG card) / sticky / frame.
 * Card không tự xử lý drag (engine bắt pointer ở wrapper); chỉ các nút
 * phụ (mở tin gốc, mở link, edit sticky) dừng propagation.
 */

import { ExternalLink, GripHorizontal, Link2, Minus, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { BoardNode } from "@/components/cins/board/board-types";
import {
  BOARD_COMMENT_MAX_W,
  BOARD_COMMENT_MIN_H,
  BOARD_COMMENT_MIN_W,
} from "@/components/cins/board/board-types";
import {
  addTableCol,
  addTableRow,
  normalizeContentKind,
  parseDraw,
  parseTable,
  pointsToSvgPath,
  removeTableCol,
  removeTableRow,
  serializeTable,
  suggestTableSize,
  TABLE_MAX_DIM,
  type CanvasTableData,
} from "@/components/cins/board/content-kinds";

export const STICKY_PALETTE = ["#FDE859", "#6EFEC0", "#FFB85C", "#BB89F8"];

/** Sticky với mau này = khối chữ thuần (không nền) — «+ Chữ». */
export const TEXT_STICKY_MAU = "transparent";

export type BoardShapeKind = "rect" | "ellipse" | "diamond";

export const SHAPE_KINDS: readonly BoardShapeKind[] = [
  "rect",
  "ellipse",
  "diamond",
] as const;

export function normalizeShapeKind(
  value: string | null | undefined,
): BoardShapeKind | null {
  if (value === "rect" || value === "ellipse" || value === "diamond") {
    return value;
  }
  return null;
}

/** Màu nền group/frame — nhẹ để không át nội dung card con. */
export const GROUP_PALETTE = [
  "rgba(31, 116, 201, 0.14)",
  "rgba(253, 173, 76, 0.18)",
  "rgba(52, 201, 138, 0.16)",
  "rgba(187, 137, 248, 0.18)",
  "rgba(240, 101, 106, 0.14)",
  "rgba(148, 163, 184, 0.2)",
];

/** Chuẩn hóa màu CSS → `#rrggbb` cho `<input type="color">`. */
export function toHexColor(
  value: string | null | undefined,
  fallback = "#1f74c9",
): string {
  const raw = value?.trim() || "";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1]!;
    const g = raw[2]!;
    const b = raw[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const m = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const h = (n: string) =>
      Math.min(255, Math.max(0, Number(n)))
        .toString(16)
        .padStart(2, "0");
    return `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`;
  }
  return fallback;
}

export function isPresetPaletteColor(
  value: string | null | undefined,
  palette: readonly string[],
): boolean {
  if (!value) return false;
  const hex = toHexColor(value);
  return palette.some((c) => c === value || toHexColor(c) === hex);
}

/** Hex → rgba nhạt cho nền nhóm (không át card con). */
export function hexToGroupTint(hex: string, alpha = 0.18): string {
  const h = toHexColor(hex);
  const r = Number.parseInt(h.slice(1, 3), 16);
  const g = Number.parseInt(h.slice(3, 5), 16);
  const b = Number.parseInt(h.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Ô chọn màu tùy chọn — bọc `<input type="color">`. */
export function CustomColorSwatch({
  value,
  isActive,
  disabled,
  onPick,
  ariaLabel = "Màu tùy chọn",
}: {
  value: string;
  isActive: boolean;
  disabled?: boolean;
  onPick: (hex: string) => void;
  ariaLabel?: string;
}) {
  const hex = toHexColor(value);
  return (
    <label
      className={
        "cins-canvas-swatch cins-canvas-swatch--custom" +
        (isActive ? " is-active" : "") +
        (disabled ? " is-disabled" : "")
      }
      style={isActive ? { background: value } : undefined}
      title={ariaLabel}
    >
      {!isActive ? (
        <span className="cins-canvas-swatch-custom-mark" aria-hidden>
          +
        </span>
      ) : null}
      <input
        type="color"
        value={hex}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onPick(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </label>
  );
}

type OgPreviewLite = {
  title: string;
  image: string | null;
  siteName: string | null;
  description: string | null;
  avatar: string | null;
  badge: string | null;
  subtitle: string | null;
};

/** Cache trong module — node re-mount (pan/zoom unmount ảo) không refetch. */
const ogCache = new Map<string, OgPreviewLite | null>();

function isSameAsUrl(value: string, url: string): boolean {
  const a = value.trim();
  const b = url.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

function OgLinkBody({ url, text }: { url: string; text: string }) {
  const [og, setOg] = useState<OgPreviewLite | null>(() =>
    ogCache.get(url) ?? null,
  );
  const [loaded, setLoaded] = useState(() => ogCache.has(url));

  // URL đổi trên cùng instance — reset state ngay trong render (không effect).
  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) {
    setPrevUrl(url);
    setOg(ogCache.get(url) ?? null);
    setLoaded(ogCache.has(url));
  }

  useEffect(() => {
    if (ogCache.has(url)) return; // state đã seed từ initializer / reset render
    let alive = true;
    void fetch(`/api/link/og?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        const preview =
          data && typeof data.title === "string"
            ? {
                title: data.title as string,
                image: (data.image ?? null) as string | null,
                siteName: (data.siteName ?? null) as string | null,
                description: (data.description ?? null) as string | null,
                avatar: (data.avatar ?? null) as string | null,
                badge: (data.badge ?? null) as string | null,
                subtitle: (data.subtitle ?? null) as string | null,
              }
            : null;
        ogCache.set(url, preview);
        setOg(preview);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  const note = text.trim();
  const noteUsable = note && !isSameAsUrl(note, url) ? note : "";
  const title =
    og?.title?.trim() ||
    noteUsable ||
    (loaded ? "Liên kết" : "Đang tải…");
  const excerpt =
    og?.description?.trim() ||
    og?.subtitle?.trim() ||
    (noteUsable && noteUsable !== title ? noteUsable : "") ||
    "";

  return (
    <div className="cins-canvas-card cins-canvas-card-link">
      <div className="cins-canvas-card-link-thumb">
        {og?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="cins-canvas-card-cover"
            src={og.image}
            alt=""
            draggable={false}
          />
        ) : (
          <div
            className="cins-canvas-card-cover cins-canvas-card-cover-empty"
            aria-hidden
          >
            {og?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="cins-canvas-card-avatar"
                src={og.avatar}
                alt=""
                draggable={false}
              />
            ) : null}
          </div>
        )}
      </div>
      <div className="cins-canvas-card-link-info">
        <strong className="cins-canvas-card-link-title">{title}</strong>
        {excerpt ? (
          <span className="cins-canvas-card-link-excerpt">{excerpt}</span>
        ) : null}
      </div>
    </div>
  );
}

type NodeCardProps = {
  node: BoardNode;
  editing: boolean;
  locked: boolean;
  /** Node đang được chọn trên board. */
  selected?: boolean;
  /** Ảnh đang upload ngầm (paste/drop) — hiện overlay loading. */
  uploading?: boolean;
  onJumpToMessage?: (messageId: string) => void;
  /** Commit nội dung sticky sau inline edit. */
  onCommitText: (
    nodeId: string,
    text: string,
    opts?: { keepEditing?: boolean },
  ) => void;
  /** Bảng: commit JSON + (tuỳ chọn) đổi kích thước node. */
  onCommitTable?: (
    nodeId: string,
    text: string,
    opts?: {
      keepEditing?: boolean;
      layout?: { w?: number; h?: number };
    },
  ) => void;
  onCancelEdit: () => void;
  /** Bảng: vào chế độ sửa (click ô). */
  onRequestEdit?: (nodeId: string) => void;
  /** Ảnh load xong — board fit khung theo natural size. */
  onImageNaturalSize?: (
    nodeId: string,
    naturalW: number,
    naturalH: number,
  ) => void;
  /** Bubble bình luận — board cập nhật w/h theo nội dung. */
  onCommentSize?: (nodeId: string, size: { w: number; h: number }) => void;
};

function StickyEditor({
  node,
  onCommitText,
  onCancelEdit,
  onInputGrow,
  tone = "sticky",
}: Pick<NodeCardProps, "node" | "onCommitText" | "onCancelEdit"> & {
  onInputGrow?: () => void;
  tone?: "sticky" | "comment";
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, tone === "comment" ? 20 : 40)}px`;
    onInputGrow?.();
  };

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      syncHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi mount / đổi node
  }, [node.id]);

  return (
    <textarea
      ref={ref}
      className={
        "cins-canvas-sticky-editor" +
        (tone === "comment" ? " is-comment" : "")
      }
      defaultValue={node.noiDung ?? ""}
      rows={1}
      onPointerDown={(e) => e.stopPropagation()}
      onInput={syncHeight}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onCancelEdit();
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommitText(node.id, e.currentTarget.value);
        }
      }}
      onBlur={(e) => onCommitText(node.id, e.currentTarget.value)}
    />
  );
}

function TableBody({
  node,
  editing,
  selected,
  locked,
  onCommitText,
  onCommitTable,
  onCancelEdit,
  onRequestEdit,
}: Pick<
  NodeCardProps,
  | "node"
  | "editing"
  | "selected"
  | "locked"
  | "onCommitText"
  | "onCommitTable"
  | "onCancelEdit"
  | "onRequestEdit"
>) {
  const parsed = parseTable(node.noiDung) ?? {
    r: 3,
    c: 3,
    cells: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
  };
  const [draft, setDraft] = useState<CanvasTableData>(parsed);
  const [prevRaw, setPrevRaw] = useState(node.noiDung);
  const [focusCell, setFocusCell] = useState<{ r: number; c: number } | null>(
    null,
  );
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  if (prevRaw !== node.noiDung) {
    setPrevRaw(node.noiDung);
    const next = parseTable(node.noiDung);
    if (next) setDraft(next);
  }

  const interactive = !locked && (editing || Boolean(selected));

  useEffect(() => {
    if (!interactive || !focusCell) return;
    const key = `${focusCell.r}:${focusCell.c}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      el.select();
    }
    setFocusCell(null);
  }, [focusCell, interactive, draft.r, draft.c]);

  const persist = (
    next: CanvasTableData,
    keepEditing = true,
    resize = false,
  ) => {
    setDraft(next);
    const text = serializeTable(next);
    if (onCommitTable && resize) {
      const size = suggestTableSize(next, {
        w: node.layout.w,
        h: node.layout.h,
      });
      onCommitTable(node.id, text, { keepEditing, layout: size });
    } else if (onCommitTable) {
      onCommitTable(node.id, text, { keepEditing });
    } else {
      onCommitText(node.id, text, { keepEditing });
    }
  };

  const enterCell = (ri: number, ci: number) => {
    if (locked) return;
    onRequestEdit?.(node.id);
    setFocusCell({ r: ri, c: ci });
  };

  const setCellRef = (ri: number, ci: number, el: HTMLInputElement | null) => {
    const key = `${ri}:${ci}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  return (
    <div
      className={
        "cins-canvas-card cins-canvas-card-table" +
        (interactive ? " is-interactive" : "")
      }
    >
      {interactive ? (
        <div
          className="cins-canvas-table-drag"
          data-table-drag
          title="Kéo để di chuyển bảng"
          aria-label="Kéo để di chuyển bảng"
        >
          <GripHorizontal size={14} strokeWidth={2} aria-hidden />
        </div>
      ) : null}

      <div className="cins-canvas-table-scroll">
        <table className="cins-canvas-table">
          <tbody>
            {draft.cells.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    {interactive ? (
                      <input
                        ref={(el) => setCellRef(ri, ci, el)}
                        className="cins-canvas-table-cell"
                        value={cell}
                        aria-label={`Ô hàng ${ri + 1}, cột ${ci + 1}`}
                        onChange={(e) => {
                          const cells = draft.cells.map((r) => [...r]);
                          cells[ri]![ci] = e.target.value;
                          setDraft({ ...draft, cells });
                        }}
                        onFocus={() => onRequestEdit?.(node.id)}
                        onBlur={(e) => {
                          const cells = draft.cells.map((r) => [...r]);
                          cells[ri]![ci] = e.target.value;
                          persist({ ...draft, cells });
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Escape") {
                            e.preventDefault();
                            onCancelEdit();
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            const cells = draft.cells.map((r) => [...r]);
                            cells[ri]![ci] = e.currentTarget.value;
                            persist({ ...draft, cells });
                            const nextR = Math.min(draft.r - 1, ri + 1);
                            if (nextR !== ri) enterCell(nextR, ci);
                            else (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === "Tab") {
                            // Cho phép Tab chuyển ô — không thoát canvas.
                            e.stopPropagation();
                          }
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          enterCell(ri, ci);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="cins-canvas-table-cell-text"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          enterCell(ri, ci);
                        }}
                      >
                        {cell || "\u00a0"}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {interactive ? (
        <div className="cins-canvas-table-tools" role="toolbar" aria-label="Sửa bảng">
          <button
            type="button"
            className="cins-canvas-table-tool"
            title={
              draft.r >= TABLE_MAX_DIM
                ? `Tối đa ${TABLE_MAX_DIM} hàng`
                : "Thêm hàng"
            }
            aria-label="Thêm hàng"
            disabled={draft.r >= TABLE_MAX_DIM}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const next = addTableRow(draft);
              if (next) persist(next, true, true);
            }}
          >
            <Plus size={13} strokeWidth={2.2} aria-hidden />
            Hàng
          </button>
          <button
            type="button"
            className="cins-canvas-table-tool"
            title={
              draft.c >= TABLE_MAX_DIM
                ? `Tối đa ${TABLE_MAX_DIM} cột`
                : "Thêm cột"
            }
            aria-label="Thêm cột"
            disabled={draft.c >= TABLE_MAX_DIM}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const next = addTableCol(draft);
              if (next) persist(next, true, true);
            }}
          >
            <Plus size={13} strokeWidth={2.2} aria-hidden />
            Cột
          </button>
          <button
            type="button"
            className="cins-canvas-table-tool"
            title={draft.r <= 1 ? "Giữ ít nhất 1 hàng" : "Xóa hàng cuối"}
            aria-label="Xóa hàng cuối"
            disabled={draft.r <= 1}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const next = removeTableRow(draft);
              if (next) persist(next, true, true);
            }}
          >
            <Minus size={13} strokeWidth={2.2} aria-hidden />
            Hàng
          </button>
          <button
            type="button"
            className="cins-canvas-table-tool"
            title={draft.c <= 1 ? "Giữ ít nhất 1 cột" : "Xóa cột cuối"}
            aria-label="Xóa cột cuối"
            disabled={draft.c <= 1}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const next = removeTableCol(draft);
              if (next) persist(next, true, true);
            }}
          >
            <Minus size={13} strokeWidth={2.2} aria-hidden />
            Cột
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DrawBody({ node }: { node: BoardNode }) {
  const data = parseDraw(node.noiDung);
  const w = node.layout.w ?? 1;
  const h = node.layout.h ?? 1;
  const color = data?.color || node.layout.mau || "#1a1a1a";
  const strokeW = data?.width ?? 2.5;
  const d = data ? pointsToSvgPath(data.points) : "";

  return (
    <div className="cins-canvas-card cins-canvas-card-draw" aria-hidden={!d}>
      <svg
        className="cins-canvas-draw-svg"
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        {d ? (
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
    </div>
  );
}

function AnhBody({
  node,
  text,
  uploading,
  onImageNaturalSize,
}: {
  node: BoardNode;
  text: string;
  uploading: boolean;
  onImageNaturalSize?: (
    nodeId: string,
    naturalW: number,
    naturalH: number,
  ) => void;
}) {
  const reportedRef = useRef(false);

  const reportSize = (img: HTMLImageElement) => {
    if (reportedRef.current) return;
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    reportedRef.current = true;
    onImageNaturalSize?.(node.id, img.naturalWidth, img.naturalHeight);
  };

  useEffect(() => {
    reportedRef.current = false;
  }, [node.id, node.url]);

  return (
    <div
      className={
        "cins-canvas-card cins-canvas-card-anh" +
        (uploading ? " is-uploading" : "")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.url ?? ""}
        alt={text || "Ảnh"}
        draggable={false}
        ref={(el) => {
          if (el?.complete) reportSize(el);
        }}
        onLoad={(e) => reportSize(e.currentTarget)}
      />
      {uploading ? (
        <span
          className="cins-canvas-anh-loading"
          aria-label="Đang tải ảnh lên"
        />
      ) : null}
    </div>
  );
}

function CommentBody({
  node,
  editing,
  locked,
  onCommitText,
  onCancelEdit,
  onCommentSize,
}: Pick<
  NodeCardProps,
  | "node"
  | "editing"
  | "locked"
  | "onCommitText"
  | "onCancelEdit"
  | "onCommentSize"
>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const author = node.layout.commentAuthor;
  const ten = author?.ten?.trim() || "Thành viên";
  const initial = ten.charAt(0).toUpperCase() || "?";
  const text = node.noiDung ?? "";

  const publishSize = useCallback(() => {
    const el = rootRef.current;
    if (!el || !onCommentSize) return;
    const prevWidth = el.style.width;
    const prevMaxWidth = el.style.maxWidth;
    const prevHeight = el.style.height;
    el.style.width = "max-content";
    el.style.maxWidth = `${BOARD_COMMENT_MAX_W}px`;
    el.style.height = "auto";
    const w = Math.ceil(
      Math.min(
        BOARD_COMMENT_MAX_W,
        Math.max(BOARD_COMMENT_MIN_W, el.offsetWidth),
      ),
    );
    const h = Math.ceil(Math.max(BOARD_COMMENT_MIN_H, el.offsetHeight));
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    el.style.height = prevHeight;
    onCommentSize(node.id, { w, h });
  }, [node.id, onCommentSize]);

  useLayoutEffect(() => {
    publishSize();
  }, [publishSize, text, editing, ten]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => publishSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [publishSize]);

  return (
    <div ref={rootRef} className="cins-canvas-card cins-canvas-card-comment">
      <div className="cins-canvas-comment-row">
        {author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="cins-canvas-comment-avatar"
            src={author.avatarUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <span className="cins-canvas-comment-avatar is-fallback" aria-hidden>
            {initial}
          </span>
        )}
        <div className="cins-canvas-comment-bubble">
          <span className="cins-canvas-comment-tail" aria-hidden />
          <strong className="cins-canvas-comment-name">{ten}</strong>
          {editing && !locked ? (
            <StickyEditor
              node={node}
              onCommitText={(id, value, opts) => {
                onCommitText(id, value, opts);
                requestAnimationFrame(publishSize);
              }}
              onCancelEdit={onCancelEdit}
              onInputGrow={publishSize}
              tone="comment"
            />
          ) : (
            <p
              className={
                "cins-canvas-comment-text" +
                (!text.trim() ? " is-placeholder" : "")
              }
            >
              {text.trim() || "Viết bình luận…"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function NodeCard({
  node,
  editing,
  locked,
  selected = false,
  uploading = false,
  onJumpToMessage,
  onCommitText,
  onCommitTable,
  onCancelEdit,
  onRequestEdit,
  onImageNaturalSize,
  onCommentSize,
}: NodeCardProps) {
  const { loai, url, noiDung, messageId } = node;
  const mau = node.layout.mau ?? "";
  const text = noiDung ?? "";
  const contentKind = normalizeContentKind(node.layout.contentKind);

  let body: ReactNode;
  if (loai === "anh") {
    body = (
      <AnhBody
        node={node}
        text={text}
        uploading={uploading}
        onImageNaturalSize={onImageNaturalSize}
      />
    );
  } else if (loai === "link") {
    body = <OgLinkBody url={url ?? ""} text={text} />;
  } else if (loai === "frame") {
    body = (
      <div
        className="cins-canvas-card cins-canvas-card-frame"
        style={{ background: mau || GROUP_PALETTE[0] }}
      >
        <span className="cins-canvas-frame-label">
          {text.trim() || "Nhóm"}
        </span>
      </div>
    );
  } else if (contentKind === "table") {
    body = (
      <TableBody
        node={node}
        editing={editing}
        selected={selected}
        locked={locked}
        onCommitText={onCommitText}
        onCommitTable={onCommitTable}
        onCancelEdit={onCancelEdit}
        onRequestEdit={onRequestEdit}
      />
    );
  } else if (contentKind === "draw") {
    body = <DrawBody node={node} />;
  } else if (contentKind === "comment") {
    body = (
      <CommentBody
        node={node}
        editing={editing}
        locked={locked}
        onCommitText={onCommitText}
        onCancelEdit={onCancelEdit}
        onCommentSize={onCommentSize}
      />
    );
  } else {
    const shapeKind = normalizeShapeKind(node.layout.shapeKind);
    const isText = !shapeKind && mau === TEXT_STICKY_MAU;
    if (shapeKind) {
      body = (
        <div className={`cins-canvas-card cins-canvas-card-shape is-${shapeKind}`}>
          <div
            className="cins-canvas-shape-fill"
            style={{ background: mau || STICKY_PALETTE[0] }}
            aria-hidden
          />
          {editing && !locked ? (
            <StickyEditor
              node={node}
              onCommitText={onCommitText}
              onCancelEdit={onCancelEdit}
            />
          ) : (
            <span className="cins-canvas-sticky-text">{text || ""}</span>
          )}
        </div>
      );
    } else {
      body = (
        <div
          className={
            "cins-canvas-card cins-canvas-card-sticky" +
            (isText ? " is-text" : "")
          }
          style={{
            background: isText ? "transparent" : mau || STICKY_PALETTE[0],
          }}
        >
          {editing && !locked ? (
            <StickyEditor
              node={node}
              onCommitText={onCommitText}
              onCancelEdit={onCancelEdit}
            />
          ) : (
            <span className="cins-canvas-sticky-text">
              {text || (isText ? "Chữ" : "Ghi chú")}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <>
      {body}
      {loai !== "frame" && messageId && onJumpToMessage ? (
        <button
          type="button"
          className="cins-canvas-jump"
          title="Mở tin gốc trong chat"
          aria-label="Mở tin gốc trong chat"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onJumpToMessage(messageId);
          }}
        >
          <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
        </button>
      ) : null}
      {loai === "link" && url ? (
        <a
          className="cins-canvas-jump cins-canvas-jump--link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Mở liên kết"
          aria-label="Mở liên kết"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Link2 size={14} strokeWidth={2.2} aria-hidden />
        </a>
      ) : null}
    </>
  );
}
