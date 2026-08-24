"use client";

/**
 * Render một node trên board — ảnh / link (OG card) / sticky / frame.
 * Card không tự xử lý drag (engine bắt pointer ở wrapper); chỉ các nút
 * phụ (mở tin gốc, mở link, edit sticky) dừng propagation.
 */

import {
  Eye,
  GripHorizontal,
  Link2,
  PanelLeft,
  PanelTop,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BOARD_COMMENT_COMPOSE_MAX_W,
  BOARD_COMMENT_COMPOSE_MIN_W,
  BOARD_COMMENT_MAX_W,
  BOARD_COMMENT_MIN_H,
  BOARD_COMMENT_MIN_W,
  BOARD_COMMENT_REPLY_INDENT,
  BOARD_COMMENT_STACK_GAP,
  nodeRect,
  type BoardNode,
} from "@/components/cins/board/board-types";
import {
  addTableCol,
  addTableHeaderCol,
  addTableHeaderRow,
  addTableRow,
  insertTableColAfter,
  insertTableRowAfter,
  normalizeContentKind,
  parseDraw,
  parseTable,
  pointsToSvgPath,
  removeTableColAt,
  removeTableHeaderCol,
  removeTableHeaderRow,
  removeTableRowAt,
  serializeTable,
  suggestTableSize,
  TABLE_MAX_DIM,
  type CanvasTableData,
} from "@/components/cins/board/content-kinds";
import { InlineExternalVideoEmbed } from "@/components/shared/InlineExternalVideoEmbed";
import { ChatMessageVideo } from "@/components/cins/ChatMessageVideo";
import { buildVideoIframeSrc } from "@/lib/journey/video-embed";
import { isDirectVideoFileUrl } from "@/lib/chat/video-url";
import {
  ChatAtMentionMenu,
  filterChatAtMembers,
  isChatAtMentionAll,
} from "@/components/cins/ChatAtMentionMenu";
import { ChatMentionText } from "@/components/cins/ChatMentionText";
import { getAtHashTrigger, type AtHashTrigger } from "@/lib/editor/use-at-hash-trigger";
import type { ChatGroupMember } from "@/lib/chat/types";

export const STICKY_PALETTE = ["#F7F383", "#6EFEC0", "#FFB85C", "#BB89F8"];

/** Sticky vàng cũ → giấy kẻ mới (hiển thị). */
export function stickyPaperColor(mau: string | null | undefined): string {
  const base = mau?.trim() || STICKY_PALETTE[0]!;
  return toHexColor(base).toUpperCase() === "#FDE859" ? "#F7F383" : base;
}

/** Sticky với mau này = khối chữ thuần (không nền) — «+ Chữ». */
export const TEXT_STICKY_MAU = "transparent";

/** Bảng màu chữ cho khối text (selbar). */
export const TEXT_COLOR_PALETTE = [
  "#1a1a1a",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
] as const;

export const DEFAULT_TEXT_COLOR = TEXT_COLOR_PALETTE[0]!;

/** Cỡ chữ preset cho khối text (px). */
export const TEXT_SIZE_PRESETS = [14, 17, 22, 28, 36] as const;

export const DEFAULT_TEXT_SIZE = 17;

export function normalizeTextSize(
  value: number | null | undefined,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 10 &&
    value <= 96
  ) {
    return Math.round(value);
  }
  return DEFAULT_TEXT_SIZE;
}

export function textBlockStyle(
  textColor?: string | null,
  textSize?: number | null,
): { color?: string; fontSize?: number } | undefined {
  const style: { color?: string; fontSize?: number } = {};
  if (textColor) style.color = textColor;
  if (textSize) style.fontSize = normalizeTextSize(textSize);
  return Object.keys(style).length > 0 ? style : undefined;
}

/** Sticky không nền — chỉ chữ (mau = transparent). */
export function isTextStickyNode(
  node: Pick<BoardNode, "loai" | "layout">,
): boolean {
  if (node.loai !== "sticky") return false;
  if (normalizeShapeKind(node.layout.shapeKind)) return false;
  if (normalizeContentKind(node.layout.contentKind)) return false;
  return (node.layout.mau?.trim() ?? STICKY_PALETTE[0]) === TEXT_STICKY_MAU;
}

/** Bubble bình luận trên canvas (`contentKind=comment`). */
export function isCommentNode(
  node: Pick<BoardNode, "loai" | "layout">,
): boolean {
  return (
    node.loai === "sticky" &&
    normalizeContentKind(node.layout.contentKind) === "comment"
  );
}

export function commentReplyToId(
  node: Pick<BoardNode, "layout">,
): string | null {
  const id = node.layout.commentReplyToId;
  return typeof id === "string" && id ? id : null;
}

/** Gốc chuỗi trả lời. */
export function commentThreadRootId(
  node: BoardNode,
  nodes: BoardNode[],
): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let id = commentReplyToId(node) ?? node.id;
  for (let i = 0; i < 24; i++) {
    const cur = byId.get(id);
    if (!cur) return id;
    const parent = commentReplyToId(cur);
    if (!parent || !byId.has(parent)) return id;
    id = parent;
  }
  return id;
}

export function commentRepliesOf(
  nodes: BoardNode[],
  rootId: string,
): BoardNode[] {
  return nodes
    .filter((n) => isCommentNode(n) && commentReplyToId(n) === rootId)
    .sort((a, b) => {
      const ta = Date.parse(a.taoLuc) || 0;
      const tb = Date.parse(b.taoLuc) || 0;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });
}

export function commentThreadIds(
  rootId: string,
  nodes: BoardNode[],
): string[] {
  return [rootId, ...commentRepliesOf(nodes, rootId).map((n) => n.id)];
}

/** Xếp reply dưới comment gốc, thụt vào. */
export function restackCommentReplies(
  nodes: BoardNode[],
  rootId: string,
): BoardNode[] {
  const root = nodes.find((n) => n.id === rootId);
  if (!root || !isCommentNode(root)) return nodes;
  const replies = commentRepliesOf(nodes, rootId);
  if (replies.length === 0) return nodes;
  const rootBox = nodeRect(root);
  let y = rootBox.y + rootBox.h + BOARD_COMMENT_STACK_GAP;
  const x = root.layout.x + BOARD_COMMENT_REPLY_INDENT;
  const nextY = new Map<string, { x: number; y: number }>();
  for (const reply of replies) {
    if (
      Math.abs(reply.layout.x - x) > 1 ||
      Math.abs(reply.layout.y - y) > 1
    ) {
      nextY.set(reply.id, { x, y });
    }
    y += nodeRect(reply).h + BOARD_COMMENT_STACK_GAP;
  }
  if (nextY.size === 0) return nodes;
  return nodes.map((n) => {
    const pos = nextY.get(n.id);
    if (!pos) return n;
    return { ...n, layout: { ...n.layout, x: pos.x, y: pos.y } };
  });
}

export function isAreaTextNode(
  node: Pick<BoardNode, "loai" | "layout">,
): boolean {
  return isTextStickyNode(node) && node.layout.textKind === "area";
}

/** Khớp `--sticky-pad-x/y` + slack caret, tránh đo canvas hẹp hơn chữ render. */
const TEXT_PAD_X = 16;
const TEXT_PAD_Y = 6;
const TEXT_FIT_SLACK = 6;
const TEXT_LINE_RATIO = 1.35;

function canvasTextFont(size: number): string {
  const family =
    typeof document !== "undefined"
      ? getComputedStyle(document.body).fontFamily || "sans-serif"
      : "sans-serif";
  return `600 ${size}px ${family}`;
}

/** Đo khung ôm chữ (line / point text) — không wrap, chỉ xuống dòng khi Enter. */
export function measureFitTextSize(
  text: string,
  fontSize = DEFAULT_TEXT_SIZE,
): { w: number; h: number } {
  const size = normalizeTextSize(fontSize);
  const lineH = Math.round(size * TEXT_LINE_RATIO);
  const lines = (text.length > 0 ? text : " ").split("\n");
  let maxW = size;
  if (typeof document !== "undefined") {
    const probe = document.createElement("span");
    const family = getComputedStyle(document.body).fontFamily || "sans-serif";
    probe.style.cssText = [
      "position:absolute",
      "left:-9999px",
      "top:0",
      "visibility:hidden",
      "white-space:pre",
      `font:600 ${size}px ${family}`,
      `line-height:${TEXT_LINE_RATIO}`,
    ].join(";");
    document.body.appendChild(probe);
    for (const line of lines) {
      probe.textContent = line.length > 0 ? line : " ";
      maxW = Math.max(maxW, probe.offsetWidth);
    }
    probe.remove();
  }
  return {
    w: Math.max(48, Math.ceil(maxW + TEXT_PAD_X * 2 + TEXT_FIT_SLACK)),
    h: Math.max(
      lineH + TEXT_PAD_Y * 2,
      Math.ceil(lines.length * lineH + TEXT_PAD_Y * 2 + 2),
    ),
  };
}

function FitTextLabel({
  text,
  style,
  fontSize,
  nodeId,
  onTextFitSize,
}: {
  text: string;
  style?: { color?: string; fontSize?: number };
  fontSize?: number | null;
  nodeId: string;
  onTextFitSize?: (nodeId: string, size: { w: number; h: number }) => void;
}) {
  useLayoutEffect(() => {
    if (!text.trim()) return;
    onTextFitSize?.(nodeId, measureFitTextSize(text, fontSize ?? undefined));
  }, [text, fontSize, nodeId, onTextFitSize]);
  return (
    <span className="cins-canvas-sticky-text" style={style}>
      {text}
    </span>
  );
}

function wrapTextLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para) {
      out.push("");
      continue;
    }
    let current = "";
    for (const word of para.split(" ")) {
      const next = current ? `${current} ${word}` : word;
      if (!current || measure(next) <= maxWidth) {
        current = next;
      } else {
        out.push(current);
        current = word;
      }
    }
    out.push(current);
  }
  return out.length > 0 ? out : [""];
}

/** Cỡ chữ để đoạn (wrap) vừa khít vùng area. */
export function measureAreaTextFontSize(
  text: string,
  boxW: number,
  boxH: number,
): number {
  const innerW = Math.max(4, boxW - TEXT_PAD_X * 2);
  const innerH = Math.max(4, boxH - TEXT_PAD_Y * 2);
  const sample = text.length > 0 ? text : "Ag";
  const min = 6;
  const max = Math.max(min, Math.min(280, innerH / 1.05));
  let lo = min;
  let hi = max;
  let best = min;
  const ctx =
    typeof document !== "undefined"
      ? document.createElement("canvas").getContext("2d")
      : null;
  const fits = (size: number) => {
    const lineH = size * TEXT_LINE_RATIO;
    if (!ctx) return lineH <= innerH;
    ctx.font = canvasTextFont(size);
    const measure = (s: string) => ctx.measureText(s).width;
    const lines = wrapTextLines(sample, innerW, measure);
    const height = lines.length * lineH;
    let maxLineW = 0;
    for (const line of lines) {
      maxLineW = Math.max(maxLineW, measure(line.length > 0 ? line : " "));
    }
    return height <= innerH + 0.5 && maxLineW <= innerW + 0.5;
  };
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round(best * 10) / 10;
}

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

/** Nút vòng màu — mở `<input type="color">` (toolbar / selbar). */
export function CanvasColorWheelInput({
  value,
  disabled,
  isActive,
  onPick,
  onPreview,
  ariaLabel = "Màu tùy chọn",
  title,
}: {
  value: string;
  disabled?: boolean;
  isActive?: boolean;
  /** Commit (blur / nhả picker) — persist + history. */
  onPick: (hex: string) => void;
  /** Kéo màu: chỉ sơn UI, không commit. */
  onPreview?: (hex: string) => void;
  ariaLabel?: string;
  title?: string;
}) {
  const committed = toHexColor(value);
  const [live, setLive] = useState(committed);
  const liveRef = useRef(committed);
  const swatchRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setLive(committed);
    liveRef.current = committed;
  }, [committed]);

  const paintLive = (hex: string) => {
    liveRef.current = hex;
    setLive(hex);
    if (swatchRef.current) swatchRef.current.style.background = hex;
    onPreview?.(hex);
  };

  return (
    <label
      className={
        "cins-canvas-colorwheel" +
        (isActive ? " is-open" : "") +
        (disabled ? " is-disabled" : "")
      }
      title={title ?? ariaLabel}
    >
      <span className="cins-canvas-colorwheel-ring" aria-hidden />
      <span
        ref={swatchRef}
        className="cins-canvas-colorwheel-current"
        style={{ background: live }}
        aria-hidden
      />
      <input
        type="color"
        value={live}
        disabled={disabled}
        aria-label={ariaLabel}
        onInput={(e) => paintLive(e.currentTarget.value)}
        onChange={(e) => paintLive(e.currentTarget.value)}
        onBlur={() => onPick(liveRef.current)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </label>
  );
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

function OgLinkBody({
  url,
  text,
  nodeId,
  mediaW,
  mediaH,
  onImageNaturalSize,
}: {
  url: string;
  text: string;
  nodeId?: string;
  mediaW?: number | null;
  mediaH?: number | null;
  onImageNaturalSize?: (
    nodeId: string,
    naturalW: number,
    naturalH: number,
  ) => void;
}) {
  const [og, setOg] = useState<OgPreviewLite | null>(() =>
    ogCache.get(url) ?? null,
  );
  const [loaded, setLoaded] = useState(() => Boolean(ogCache.get(url)));
  const iframeSrc = useMemo(() => buildVideoIframeSrc(url), [url]);
  const isFileVideo = useMemo(() => isDirectVideoFileUrl(url), [url]);

  // URL đổi trên cùng instance — reset state ngay trong render (không effect).
  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) {
    setPrevUrl(url);
    setOg(ogCache.get(url) ?? null);
    setLoaded(Boolean(ogCache.get(url)));
  }

  useEffect(() => {
    if (isFileVideo) {
      setLoaded(true);
      return;
    }
    const cached = ogCache.get(url);
    if (cached) return; // đã có preview hợp lệ
    if (ogCache.has(url)) ogCache.delete(url); // bỏ cache miss cũ
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
        if (preview) ogCache.set(url, preview);
        setOg(preview);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [url, isFileVideo]);

  const note = text.trim();
  const noteUsable = note && !isSameAsUrl(note, url) ? note : "";
  const title = isFileVideo
    ? noteUsable || "Video"
    : og?.title?.trim() ||
      noteUsable ||
      (iframeSrc
        ? loaded
          ? "Video"
          : "Đang tải…"
        : loaded
          ? "Liên kết"
          : "Đang tải…");
  const excerpt = isFileVideo
    ? ""
    : og?.description?.trim() ||
      og?.subtitle?.trim() ||
      (noteUsable && noteUsable !== title ? noteUsable : "") ||
      "";

  return (
    <div
      className={`cins-canvas-card cins-canvas-card-link${iframeSrc || isFileVideo ? " is-video" : ""}${isFileVideo ? " is-file-video" : ""}`}
    >
      <div className="cins-canvas-card-link-thumb">
        {isFileVideo ? (
          <div
            className="cins-canvas-card-link-video-wrap"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <ChatMessageVideo
              src={url}
              stacked
              width={mediaW}
              height={mediaH}
              onNaturalSize={
                nodeId && onImageNaturalSize
                  ? (w, h) => onImageNaturalSize(nodeId, w, h)
                  : undefined
              }
            />
          </div>
        ) : iframeSrc ? (
          <div
            className="cins-canvas-card-link-video-wrap"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <InlineExternalVideoEmbed
              src={iframeSrc}
              href={url}
              openMode="embed"
              gate={false}
              title={title === "Đang tải…" ? "Video" : title}
              className="cins-canvas-card-link-video"
            />
          </div>
        ) : og?.image ? (
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
  /** Point text — board ôm khung theo chữ. */
  onTextFitSize?: (nodeId: string, size: { w: number; h: number }) => void;
  /** Trả lời bình luận trên canvas. */
  onReplyComment?: (nodeId: string) => void;
  /** Xóa một node comment (reply lồng — không xóa cả thread). */
  onDeleteComment?: (nodeId: string) => void;
  /** Các reply thuộc comment gốc — render trong cùng bubble. */
  commentReplies?: BoardNode[];
  /** Id node đang soạn (gốc hoặc reply lồng). */
  editingId?: string | null;
  /** Thành viên phòng — gợi ý @tag trong comment. */
  mentionMembers?: ChatGroupMember[];
  /** User đang xem — hiện nút Sửa trên comment của mình. */
  viewerUserId?: string | null;
};

function StickyEditor({
  node,
  onCommitText,
  onCancelEdit,
  onInputGrow,
  tone = "sticky",
  textColor,
  textSize,
  area = false,
  areaBox,
  mentionMembers = [],
}: Pick<NodeCardProps, "node" | "onCommitText" | "onCancelEdit"> & {
  onInputGrow?: (value: string) => void;
  tone?: "sticky" | "comment";
  textColor?: string | null;
  textSize?: number | null;
  area?: boolean;
  areaBox?: { w: number; h: number };
  mentionMembers?: ChatGroupMember[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const commitRef = useRef(onCommitText);
  const skipUnmountCommitRef = useRef(false);
  /** Giữ chữ đang gõ — unmount khi click nền có thể xóa DOM ref trước khi commit. */
  const liveValueRef = useRef(node.noiDung ?? "");
  const mountedAtRef = useRef(0);
  const [atTrigger, setAtTrigger] = useState<AtHashTrigger | null>(null);
  const [atIndex, setAtIndex] = useState(0);
  commitRef.current = onCommitText;

  const isComment = tone === "comment";
  const atMembers = useMemo(
    () =>
      atTrigger?.char === "@"
        ? filterChatAtMembers(mentionMembers, atTrigger.query)
        : [],
    [atTrigger, mentionMembers],
  );

  const applyAreaFont = (value: string) => {
    const el = ref.current;
    if (!el || !area || !areaBox) return;
    const size = measureAreaTextFontSize(value, areaBox.w, areaBox.h);
    el.style.fontSize = `${size}px`;
    el.style.lineHeight = String(TEXT_LINE_RATIO);
  };

  const syncAtTrigger = () => {
    const el = ref.current;
    if (!el || !isComment || mentionMembers.length === 0) {
      setAtTrigger(null);
      return;
    }
    const trigger = getAtHashTrigger(el.value, el.selectionStart ?? 0);
    if (!trigger || trigger.char !== "@") {
      setAtTrigger(null);
      return;
    }
    setAtTrigger(trigger);
    setAtIndex(0);
  };

  const syncSizer = (value: string) => {
    const sizer = sizerRef.current;
    if (!sizer) return;
    const raw = value.length > 0 ? value : "\u00a0";
    sizer.textContent = raw.endsWith("\n") ? `${raw}\n` : raw;
  };

  const syncHeight = () => {
    const el = ref.current;
    if (!el) return;
    liveValueRef.current = el.value;
    if (area) {
      el.style.height = "100%";
      applyAreaFont(el.value);
      return;
    }
    if (isComment) {
      syncSizer(el.value);
      onInputGrow?.(el.value);
      syncAtTrigger();
      return;
    }
    el.style.overflow = "hidden";
    el.style.height = "auto";
    el.style.width = "auto";
    const nextH = Math.max(el.scrollHeight, 40);
    el.style.height = `${nextH}px`;
    onInputGrow?.(el.value);
  };

  const send = () => {
    const el = ref.current;
    const value = el?.value ?? liveValueRef.current;
    if (!value.trim()) return;
    liveValueRef.current = value;
    skipUnmountCommitRef.current = true;
    onCommitText(node.id, value);
  };

  const insertMention = (member: ChatGroupMember) => {
    const el = ref.current;
    if (!el || !atTrigger) return;
    const slug = isChatAtMentionAll(member) ? "all" : member.slug;
    const insert = `@${slug} `;
    const next =
      el.value.slice(0, atTrigger.start) + insert + el.value.slice(atTrigger.end);
    el.value = next;
    liveValueRef.current = next;
    const caret = atTrigger.start + insert.length;
    el.focus({ preventScroll: true });
    el.setSelectionRange(caret, caret);
    setAtTrigger(null);
    syncHeight();
  };

  useEffect(() => {
    liveValueRef.current = node.noiDung ?? "";
    mountedAtRef.current = Date.now();
    const el = ref.current;
    if (el) {
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
      syncHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi mount / đổi node
  }, [node.id]);

  useEffect(() => {
    const id = node.id;
    return () => {
      if (skipUnmountCommitRef.current) return;
      const value = liveValueRef.current;
      // Luôn keepEditing khi unmount: Strict Mode remount / đổi focus không được
      // xóa bubble trống hay tắt phiên soạn. Xóa trống chỉ blur/Escape/discardBlank.
      commitRef.current(id, value, { keepEditing: true });
    };
  }, [node.id]);

  useEffect(() => {
    if (!area || !areaBox) return;
    applyAreaFont(ref.current?.value ?? node.noiDung ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi đổi khung area
  }, [area, areaBox?.w, areaBox?.h]);

  const editor = (
    <textarea
      ref={ref}
      className={
        "cins-canvas-sticky-editor" +
        (isComment ? " is-comment" : "") +
        (area ? " is-area" : "")
      }
      defaultValue={node.noiDung ?? ""}
      rows={1}
      style={textBlockStyle(textColor, textSize)}
      onPointerDown={(e) => e.stopPropagation()}
      onInput={syncHeight}
      onKeyUp={() => {
        if (isComment) syncAtTrigger();
      }}
      onClick={() => {
        if (isComment) syncAtTrigger();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (isComment && atTrigger && atMembers.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAtIndex((i) => (i + 1) % atMembers.length);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setAtIndex((i) => (i - 1 + atMembers.length) % atMembers.length);
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const pick = atMembers[atIndex] ?? atMembers[0];
            if (pick) insertMention(pick);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setAtTrigger(null);
            return;
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          skipUnmountCommitRef.current = true;
          onCancelEdit();
        }
        if (isComment && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          send();
          return;
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          liveValueRef.current = e.currentTarget.value;
          skipUnmountCommitRef.current = true;
          onCommitText(node.id, e.currentTarget.value);
        }
      }}
      onBlur={(e) => {
        liveValueRef.current = e.currentTarget.value;
        const related = e.relatedTarget as HTMLElement | null;
        if (related?.closest(".cins-canvas-comment-compose")) return;
        const empty = !e.currentTarget.value.trim();
        // Mất focus không do click sang control khác (camera / Strict Mode) —
        // giữ ô soạn, đừng xóa comment trống.
        if (empty && !e.relatedTarget) {
          requestAnimationFrame(() => {
            ref.current?.focus({ preventScroll: true });
          });
          return;
        }
        if (isComment && empty) return;
        onCommitText(
          node.id,
          e.currentTarget.value,
          isComment ? { keepEditing: true } : undefined,
        );
      }}
    />
  );

  if (!isComment) return editor;

  return (
    <div className="cins-canvas-comment-compose">
      {atTrigger && atMembers.length > 0 ? (
        <ChatAtMentionMenu
          members={mentionMembers}
          query={atTrigger.query}
          activeIndex={atIndex}
          onHoverIndex={setAtIndex}
          onSelect={insertMention}
        />
      ) : null}
      <span
        ref={sizerRef}
        className="cins-canvas-comment-sizer"
        aria-hidden
        style={{
          minWidth: BOARD_COMMENT_COMPOSE_MIN_W,
          maxWidth: BOARD_COMMENT_COMPOSE_MAX_W,
        }}
      />
      {editor}
      <button
        type="button"
        className="cins-canvas-comment-send"
        aria-label="Gửi"
        title="Gửi (Enter)"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          send();
        }}
      >
        <Send size={14} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}

function TableIconBtn({
  label,
  disabled,
  onClick,
  onHover,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  onHover?: (active: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={"cins-canvas-table-icon" + (className ? ` ${className}` : "")}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-table-ui
      onPointerDown={(e) => e.stopPropagation()}
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
    >
      {children}
    </button>
  );
}

type TableHover = {
  col: number | null;
  row: number | null;
  mark: null | {
    axis: "col" | "row";
    at: number;
    kind: "insert" | "delete" | "end";
  };
};

const EMPTY_TABLE_HOVER: TableHover = { col: null, row: null, mark: null };

function tableHoverHint(
  hover: TableHover,
  dims: { r: number; c: number },
): string | null {
  const mark = hover.mark;
  if (!mark) {
    if (hover.col != null && hover.row != null) {
      return `Cột ${hover.col + 1} · Hàng ${hover.row + 1}`;
    }
    if (hover.col != null) return `Cột ${hover.col + 1}`;
    if (hover.row != null) return `Hàng ${hover.row + 1}`;
    return null;
  }
  if (mark.axis === "col") {
    if (mark.kind === "delete") return `Xóa cột ${mark.at + 1}`;
    if (mark.kind === "end") return `Thêm cột sau cột ${dims.c}`;
    if (mark.at >= dims.c - 1) return `Chèn sau cột ${mark.at + 1}`;
    return `Chèn giữa cột ${mark.at + 1} và ${mark.at + 2}`;
  }
  if (mark.kind === "delete") return `Xóa hàng ${mark.at + 1}`;
  if (mark.kind === "end") return `Thêm hàng sau hàng ${dims.r}`;
  if (mark.at >= dims.r - 1) return `Chèn sau hàng ${mark.at + 1}`;
  return `Chèn giữa hàng ${mark.at + 1} và ${mark.at + 2}`;
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
  const [hover, setHover] = useState<TableHover>(EMPTY_TABLE_HOVER);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  if (prevRaw !== node.noiDung) {
    setPrevRaw(node.noiDung);
    const next = parseTable(node.noiDung);
    if (next) setDraft(next);
  }

  const interactive = !locked && editing;
  const showChrome = !locked && (interactive || selected);

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

  const hint = showChrome
    ? tableHoverHint(hover, { r: draft.r, c: draft.c })
    : null;
  const delCol =
    hover.mark?.kind === "delete" && hover.mark.axis === "col"
      ? hover.mark.at
      : null;
  const delRow =
    hover.mark?.kind === "delete" && hover.mark.axis === "row"
      ? hover.mark.at
      : null;
  const insCol =
    hover.mark &&
    hover.mark.axis === "col" &&
    (hover.mark.kind === "insert" || hover.mark.kind === "end")
      ? hover.mark.at
      : null;
  const insRow =
    hover.mark &&
    hover.mark.axis === "row" &&
    (hover.mark.kind === "insert" || hover.mark.kind === "end")
      ? hover.mark.at
      : null;

  return (
    <div
      className={
        "cins-canvas-card cins-canvas-card-table" +
        (interactive ? " is-interactive" : "") +
        (showChrome ? " has-rails" : "")
      }
      onPointerLeave={() => setHover(EMPTY_TABLE_HOVER)}
    >
      {showChrome ? (
        <div className="cins-canvas-table-chrome" aria-label="Sửa bảng">
          <div
            className="cins-canvas-table-drag"
            data-table-drag
            title="Kéo để di chuyển bảng"
            aria-label="Kéo để di chuyển bảng"
          >
            <GripHorizontal size={14} strokeWidth={2} aria-hidden />
            {hint ? (
              <span className="cins-canvas-table-hint">{hint}</span>
            ) : null}
          </div>
          <div className="cins-canvas-table-corner">
            <TableIconBtn
              label={
                draft.headerRow
                  ? "Gỡ hàng header"
                  : draft.r >= TABLE_MAX_DIM
                    ? `Tối đa ${TABLE_MAX_DIM} hàng`
                    : "Thêm hàng header (ngang)"
              }
              className={"is-toggle" + (draft.headerRow ? " is-on" : "")}
              disabled={!draft.headerRow && draft.r >= TABLE_MAX_DIM}
              onClick={() => {
                const next = draft.headerRow
                  ? removeTableHeaderRow(draft)
                  : addTableHeaderRow(draft);
                if (next) persist(next, true, true);
              }}
            >
              <PanelTop size={11} strokeWidth={2.2} aria-hidden />
            </TableIconBtn>
            <TableIconBtn
              label={
                draft.headerCol
                  ? "Gỡ cột header"
                  : draft.c >= TABLE_MAX_DIM
                    ? `Tối đa ${TABLE_MAX_DIM} cột`
                    : "Thêm cột header (dọc)"
              }
              className={"is-toggle" + (draft.headerCol ? " is-on" : "")}
              disabled={!draft.headerCol && draft.c >= TABLE_MAX_DIM}
              onClick={() => {
                const next = draft.headerCol
                  ? removeTableHeaderCol(draft)
                  : addTableHeaderCol(draft);
                if (next) persist(next, true, true);
              }}
            >
              <PanelLeft size={11} strokeWidth={2.2} aria-hidden />
            </TableIconBtn>
          </div>
          <div className="cins-canvas-table-col-rail">
            {draft.cells[0]?.map((_, ci) => (
              <div
                key={ci}
                className={
                  "cins-canvas-table-col-slot" +
                  (hover.col === ci ? " is-hot" : "")
                }
                onPointerEnter={() =>
                  setHover((prev) => ({
                    ...prev,
                    col: ci,
                    mark: prev.mark?.axis === "col" ? prev.mark : null,
                  }))
                }
              >
                <TableIconBtn
                  label={
                    draft.c <= 1
                      ? "Giữ ít nhất 1 cột"
                      : draft.headerCol && ci === 0
                        ? "Xóa cột header"
                        : `Xóa cột ${ci + 1}`
                  }
                  disabled={draft.c <= 1}
                  onHover={(active) =>
                    setHover((prev) => ({
                      col: ci,
                      row: prev.row,
                      mark: active
                        ? { axis: "col", at: ci, kind: "delete" }
                        : null,
                    }))
                  }
                  onClick={() => {
                    const next = removeTableColAt(draft, ci);
                    if (next) persist(next, true, true);
                  }}
                >
                  <X size={10} strokeWidth={2.4} aria-hidden />
                </TableIconBtn>
                <TableIconBtn
                  label={
                    draft.c >= TABLE_MAX_DIM
                      ? `Tối đa ${TABLE_MAX_DIM} cột`
                      : `Thêm cột sau cột ${ci + 1}`
                  }
                  disabled={draft.c >= TABLE_MAX_DIM}
                  onHover={(active) =>
                    setHover((prev) => ({
                      col: ci,
                      row: prev.row,
                      mark: active
                        ? { axis: "col", at: ci, kind: "insert" }
                        : null,
                    }))
                  }
                  onClick={() => {
                    const next = insertTableColAfter(draft, ci);
                    if (next) persist(next, true, true);
                  }}
                >
                  <Plus size={11} strokeWidth={2.4} aria-hidden />
                </TableIconBtn>
              </div>
            ))}
            <TableIconBtn
              label={
                draft.c >= TABLE_MAX_DIM
                  ? `Tối đa ${TABLE_MAX_DIM} cột`
                  : "Thêm cột cuối"
              }
              className="is-edge is-edge-col"
              disabled={draft.c >= TABLE_MAX_DIM}
              onHover={(active) =>
                setHover((prev) => ({
                  col: prev.col,
                  row: prev.row,
                  mark: active
                    ? { axis: "col", at: draft.c - 1, kind: "end" }
                    : null,
                }))
              }
              onClick={() => {
                const next = addTableCol(draft);
                if (next) persist(next, true, true);
              }}
            >
              <Plus size={12} strokeWidth={2.4} aria-hidden />
            </TableIconBtn>
          </div>
          <div className="cins-canvas-table-row-rail">
            {draft.cells.map((_, ri) => (
              <div
                key={ri}
                className={
                  "cins-canvas-table-row-slot" +
                  (hover.row === ri ? " is-hot" : "")
                }
                onPointerEnter={() =>
                  setHover((prev) => ({
                    ...prev,
                    row: ri,
                    mark: prev.mark?.axis === "row" ? prev.mark : null,
                  }))
                }
              >
                <TableIconBtn
                  label={
                    draft.r <= 1
                      ? "Giữ ít nhất 1 hàng"
                      : draft.headerRow && ri === 0
                        ? "Xóa hàng header"
                        : `Xóa hàng ${ri + 1}`
                  }
                  disabled={draft.r <= 1}
                  onHover={(active) =>
                    setHover((prev) => ({
                      col: prev.col,
                      row: ri,
                      mark: active
                        ? { axis: "row", at: ri, kind: "delete" }
                        : null,
                    }))
                  }
                  onClick={() => {
                    const next = removeTableRowAt(draft, ri);
                    if (next) persist(next, true, true);
                  }}
                >
                  <X size={10} strokeWidth={2.4} aria-hidden />
                </TableIconBtn>
                <TableIconBtn
                  label={
                    draft.r >= TABLE_MAX_DIM
                      ? `Tối đa ${TABLE_MAX_DIM} hàng`
                      : `Thêm hàng dưới hàng ${ri + 1}`
                  }
                  disabled={draft.r >= TABLE_MAX_DIM}
                  onHover={(active) =>
                    setHover((prev) => ({
                      col: prev.col,
                      row: ri,
                      mark: active
                        ? { axis: "row", at: ri, kind: "insert" }
                        : null,
                    }))
                  }
                  onClick={() => {
                    const next = insertTableRowAfter(draft, ri);
                    if (next) persist(next, true, true);
                  }}
                >
                  <Plus size={11} strokeWidth={2.4} aria-hidden />
                </TableIconBtn>
              </div>
            ))}
            <TableIconBtn
              label={
                draft.r >= TABLE_MAX_DIM
                  ? `Tối đa ${TABLE_MAX_DIM} hàng`
                  : "Thêm hàng cuối"
              }
              className="is-edge is-edge-row"
              disabled={draft.r >= TABLE_MAX_DIM}
              onHover={(active) =>
                setHover((prev) => ({
                  col: prev.col,
                  row: prev.row,
                  mark: active
                    ? { axis: "row", at: draft.r - 1, kind: "end" }
                    : null,
                }))
              }
              onClick={() => {
                const next = addTableRow(draft);
                if (next) persist(next, true, true);
              }}
            >
              <Plus size={12} strokeWidth={2.4} aria-hidden />
            </TableIconBtn>
          </div>
        </div>
      ) : null}

      <div className="cins-canvas-table-scroll">
        <div className="cins-canvas-table-inner">
            <table className="cins-canvas-table">
              <tbody>
                {draft.cells.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      const isHeaderCol = Boolean(draft.headerCol && ci === 0);
                      const isHeaderRow = Boolean(draft.headerRow && ri === 0);
                      const isHeader = isHeaderCol || isHeaderRow;
                      const isCorner = isHeaderCol && isHeaderRow;
                      const Cell = isHeader ? "th" : "td";
                      const cellClass = [
                        isCorner
                          ? "is-header-corner"
                          : isHeaderRow
                            ? "is-header-row"
                            : isHeaderCol
                              ? "is-header-col"
                              : "",
                        hover.col === ci ? "is-hot-col" : "",
                        hover.row === ri ? "is-hot-row" : "",
                        delCol === ci ? "is-delete-col" : "",
                        delRow === ri ? "is-delete-row" : "",
                        insCol === ci ? "is-insert-after-col" : "",
                        insRow === ri ? "is-insert-after-row" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <Cell
                          key={ci}
                          className={cellClass || undefined}
                          scope={
                            isHeaderRow
                              ? "col"
                              : isHeaderCol
                                ? "row"
                                : undefined
                          }
                          onPointerEnter={() => {
                            if (!showChrome) return;
                            setHover({ col: ci, row: ri, mark: null });
                          }}
                        >
                          {interactive ? (
                            <input
                              ref={(el) => setCellRef(ri, ci, el)}
                              className={
                                "cins-canvas-table-cell" +
                                (isHeader ? " is-header" : "") +
                                (isHeaderRow ? " is-header-row" : "") +
                                (isHeaderCol ? " is-header-col" : "")
                              }
                              value={cell}
                              aria-label={
                                isCorner
                                  ? "Header góc"
                                  : isHeaderRow
                                    ? `Header cột ${ci + 1}`
                                    : isHeaderCol
                                      ? `Header hàng ${ri + 1}`
                                      : `Ô hàng ${ri + 1}, cột ${ci + 1}`
                              }
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
                              className={
                                "cins-canvas-table-cell-text" +
                                (isHeader ? " is-header" : "") +
                                (isHeaderRow ? " is-header-row" : "") +
                                (isHeaderCol ? " is-header-col" : "")
                              }
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                enterCell(ri, ci);
                              }}
                            >
                              {cell || "\u00a0"}
                            </button>
                          )}
                        </Cell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
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

function CommentAuthorAvatar({
  author,
  compact,
}: {
  author: BoardNode["layout"]["commentAuthor"];
  compact?: boolean;
}) {
  const ten = author?.ten?.trim() || "Thành viên";
  const initial = ten.charAt(0).toUpperCase() || "?";
  if (author?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={
          "cins-canvas-comment-avatar" + (compact ? " is-nested" : "")
        }
        src={author.avatarUrl}
        alt=""
        draggable={false}
      />
    );
  }
  return (
    <span
      className={
        "cins-canvas-comment-avatar is-fallback" +
        (compact ? " is-nested" : "")
      }
      aria-hidden
    >
      {initial}
    </span>
  );
}

function commentOwnedByViewer(
  node: BoardNode,
  viewerUserId: string | null | undefined,
): boolean {
  if (!viewerUserId) return false;
  if (node.layout.commentAuthor?.id === viewerUserId) return true;
  if (node.idNguoiTao && node.idNguoiTao === viewerUserId) return true;
  return false;
}

function CommentMoreMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canEdit && !canDelete) return null;

  return (
    <div ref={wrapRef} className="cins-canvas-comment-more-wrap">
      <button
        type="button"
        className="cins-canvas-comment-more"
        aria-label="Thêm"
        aria-expanded={open}
        title="Thêm"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal size={14} strokeWidth={2.2} aria-hidden />
      </button>
      {open ? (
        <div className="cins-canvas-comment-more-menu" role="menu">
          {canEdit ? (
            <button
              type="button"
              role="menuitem"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil size={12} strokeWidth={2.2} aria-hidden />
              Sửa
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={12} strokeWidth={2.2} aria-hidden />
              Xóa
            </button>
          ) : null}
        </div>
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
  onReplyComment,
  onRequestEdit,
  onDeleteComment,
  commentReplies = [],
  editingId = null,
  mentionMembers = [],
  viewerUserId = null,
}: Pick<
  NodeCardProps,
  | "node"
  | "editing"
  | "locked"
  | "onCommitText"
  | "onCancelEdit"
  | "onCommentSize"
  | "onReplyComment"
  | "onRequestEdit"
  | "onDeleteComment"
  | "commentReplies"
  | "editingId"
  | "mentionMembers"
  | "viewerUserId"
>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const author = node.layout.commentAuthor;
  const ten = author?.ten?.trim() || "Thành viên";
  const text = node.noiDung ?? "";
  const replyKey = commentReplies
    .map((r) => `${r.id}:${r.noiDung ?? ""}`)
    .join("|");

  const publishSize = useCallback(() => {
    const el = rootRef.current;
    if (!el || !onCommentSize) return;
    const prevWidth = el.style.width;
    const prevMaxWidth = el.style.maxWidth;
    const prevMinWidth = el.style.minWidth;
    const prevHeight = el.style.height;
    el.style.width = "max-content";
    el.style.minWidth = `${BOARD_COMMENT_MIN_W}px`;
    el.style.maxWidth = `${BOARD_COMMENT_MAX_W}px`;
    el.style.height = "auto";
    const w = Math.ceil(
      Math.min(
        BOARD_COMMENT_MAX_W,
        Math.max(BOARD_COMMENT_MIN_W, el.scrollWidth, el.offsetWidth),
      ),
    );
    const h = Math.ceil(
      Math.max(BOARD_COMMENT_MIN_H, el.scrollHeight, el.offsetHeight),
    );
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    el.style.minWidth = prevMinWidth;
    el.style.height = prevHeight;
    onCommentSize(node.id, { w, h });
  }, [node.id, onCommentSize]);

  useLayoutEffect(() => {
    publishSize();
  }, [publishSize, text, editing, ten, replyKey, editingId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => publishSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [publishSize]);

  const showReplyBtn =
    !locked && !editingId && Boolean(text.trim()) && Boolean(onReplyComment);
  const canEditRoot = !locked && !editing && commentOwnedByViewer(node, viewerUserId);

  return (
    <div ref={rootRef} className="cins-canvas-card cins-canvas-card-comment">
      <div className="cins-canvas-comment-row">
        <CommentAuthorAvatar author={author} />
        <div className="cins-canvas-comment-bubble">
          <span className="cins-canvas-comment-tail" aria-hidden />
          <div className="cins-canvas-comment-head">
            <strong className="cins-canvas-comment-name">{ten}</strong>
            {canEditRoot ? (
              <button
                type="button"
                className="cins-canvas-comment-edit is-icon"
                aria-label="Sửa"
                title="Sửa"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestEdit?.(node.id);
                }}
              >
                <Pencil size={12} strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
          </div>
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
              mentionMembers={mentionMembers}
            />
          ) : (
            <p
              className={
                "cins-canvas-comment-text" +
                (!text.trim() ? " is-placeholder" : "")
              }
            >
              {text.trim() ? (
                <ChatMentionText text={text} />
              ) : (
                "Viết bình luận…"
              )}
            </p>
          )}
          {commentReplies.length > 0 ? (
            <div className="cins-canvas-comment-thread">
              {commentReplies.map((reply) => {
                const rAuthor = reply.layout.commentAuthor;
                const rTen = rAuthor?.ten?.trim() || "Thành viên";
                const rText = reply.noiDung ?? "";
                const rEditing = editingId === reply.id;
                return (
                  <div
                    key={reply.id}
                    className="cins-canvas-comment-nested"
                    onDoubleClick={(e) => {
                      if (locked) return;
                      e.stopPropagation();
                      onRequestEdit?.(reply.id);
                    }}
                  >
                    <CommentAuthorAvatar author={rAuthor} compact />
                    <div className="cins-canvas-comment-nested-body">
                      <div className="cins-canvas-comment-nested-head">
                        <strong className="cins-canvas-comment-name">
                          {rTen}
                        </strong>
                        {!locked && !rEditing ? (
                          <CommentMoreMenu
                            canEdit
                            canDelete={Boolean(onDeleteComment)}
                            onEdit={() => onRequestEdit?.(reply.id)}
                            onDelete={() => onDeleteComment?.(reply.id)}
                          />
                        ) : null}
                      </div>
                      {rEditing && !locked ? (
                        <StickyEditor
                          node={reply}
                          onCommitText={(id, value, opts) => {
                            onCommitText(id, value, opts);
                            requestAnimationFrame(publishSize);
                          }}
                          onCancelEdit={onCancelEdit}
                          onInputGrow={publishSize}
                          tone="comment"
                          mentionMembers={mentionMembers}
                        />
                      ) : (
                        <p
                          className={
                            "cins-canvas-comment-text" +
                            (!rText.trim() ? " is-placeholder" : "")
                          }
                        >
                          {rText.trim() ? (
                            <ChatMentionText text={rText} />
                          ) : (
                            "Viết trả lời…"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {showReplyBtn ? (
            <div className="cins-canvas-comment-actions">
              <button
                type="button"
                className="cins-canvas-comment-reply"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onReplyComment?.(node.id);
                }}
              >
                Trả lời
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const NodeCard = memo(function NodeCard({
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
  onTextFitSize,
  onReplyComment,
  commentReplies,
  editingId,
  mentionMembers,
  viewerUserId,
  onDeleteComment,
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
    body = (
      <OgLinkBody
        url={url ?? ""}
        text={text}
        nodeId={node.id}
        mediaW={node.layout.mediaW}
        mediaH={node.layout.mediaH}
        onImageNaturalSize={onImageNaturalSize}
      />
    );
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
        onReplyComment={onReplyComment}
        onRequestEdit={onRequestEdit}
        onDeleteComment={onDeleteComment}
        commentReplies={commentReplies}
        editingId={editingId}
        mentionMembers={mentionMembers}
        viewerUserId={viewerUserId}
      />
    );
  } else {
    const shapeKind = normalizeShapeKind(node.layout.shapeKind);
    const isText = isTextStickyNode(node);
    const isArea = isAreaTextNode(node);
    const paperMau = stickyPaperColor(mau);
    const textColor = isText ? node.layout.textColor : null;
    const textSize = isText ? node.layout.textSize : null;
    const areaFont = isArea
      ? measureAreaTextFontSize(
          text,
          node.layout.w ?? 160,
          node.layout.h ?? 80,
        )
      : null;
    const textStyle = isText
      ? isArea
        ? {
            ...(textColor ? { color: textColor } : {}),
            fontSize: areaFont ?? DEFAULT_TEXT_SIZE,
            lineHeight: TEXT_LINE_RATIO,
          }
        : textBlockStyle(textColor, textSize)
      : undefined;
    if (shapeKind) {
      body = (
        <div className={`cins-canvas-card cins-canvas-card-shape is-${shapeKind}`}>
          <div
            className="cins-canvas-shape-fill"
            style={{ background: paperMau }}
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
            (isText ? " is-text" : "") +
            (isArea ? " is-text-area" : "") +
            (isText && !isArea ? " is-text-fit" : "")
          }
          style={{
            backgroundColor: isText ? "transparent" : paperMau,
          }}
        >
          {editing && !locked ? (
            <StickyEditor
              node={node}
              onCommitText={onCommitText}
              onCancelEdit={onCancelEdit}
              textColor={textColor}
              textSize={isArea ? areaFont : textSize}
              area={isArea}
              areaBox={
                isArea
                  ? {
                      w: node.layout.w ?? 160,
                      h: node.layout.h ?? 80,
                    }
                  : undefined
              }
              onInputGrow={
                isText && !isArea && onTextFitSize
                  ? (value) =>
                      onTextFitSize(
                        node.id,
                        measureFitTextSize(value, textSize ?? undefined),
                      )
                  : undefined
              }
            />
          ) : isText && !isArea ? (
            <FitTextLabel
              text={text.trim() ? text : ""}
              style={textStyle}
              fontSize={textSize}
              nodeId={node.id}
              onTextFitSize={onTextFitSize}
            />
          ) : (
            <span className="cins-canvas-sticky-text" style={textStyle}>
              {text || "Ghi chú"}
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
          <Eye size={14} strokeWidth={2.2} aria-hidden />
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
});
