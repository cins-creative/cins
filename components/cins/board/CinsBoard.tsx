"use client";

/**
 * CinsBoard — infinite canvas engine tự viết (thay tldraw).
 *
 * - Camera pan/zoom bằng CSS transform trên world layer (ghi DOM trực tiếp;
 *   React chỉ flush 1 lần/frame cho lưới / thanh chọn — không re-render card).
 *   Desktop: wheel / pinch trackpad. Cảm ứng: 2 ngón pinch zoom + pan.
 * - Node render HTML tuyệt đối (NodeCard) — kéo, resize, multi-select,
 *   marquee, group/frame, undo/redo command stack.
 * - Persist qua adapter (BoardPersistAdapter) — engine không biết endpoint.
 * - Tọa độ trong engine tuyệt đối; node thuộc group LƯU tương đối so với
 *   frame (tương thích dữ liệu cũ) — quy đổi khi hydrate / persist.
 * - Mọi mutation node đi qua `commitNodes` để `nodesRef` luôn đồng bộ
 *   ngay lập tức (gesture handlers đọc ref, không chờ re-render).
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Group,
  Trash2,
  Ungroup,
} from "lucide-react";

import {
  NodeCard,
  CanvasColorWheelInput,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SIZE,
  GROUP_PALETTE,
  SHAPE_KINDS,
  STICKY_PALETTE,
  TEXT_COLOR_PALETTE,
  TEXT_SIZE_PRESETS,
  TEXT_STICKY_MAU,
  hexToGroupTint,
  isAreaTextNode,
  isCommentNode,
  isPresetPaletteColor,
  isTextStickyNode,
  measureFitTextSize,
  normalizeTextSize,
  normalizeShapeKind,
  type BoardShapeKind,
} from "@/components/cins/board/NodeCard";
import {
  createEmptyTable,
  normalizeContentKind,
  pointsToSvgPath,
  serializeDraw,
  serializeTable,
  simplifyStroke,
  parseDraw,
  suggestTableSize,
} from "@/components/cins/board/content-kinds";
import {
  BOARD_DEFAULT_NODE_H,
  BOARD_DEFAULT_NODE_W,
  BOARD_COMMENT_MIN_H,
  BOARD_COMMENT_MIN_W,
  BOARD_LINK_INFO_H,
  BOARD_MAX_ZOOM,
  BOARD_MIN_NODE_SIZE,
  BOARD_MIN_ZOOM,
  fitBoardImageSize,
  fitBoardLinkVideoSize,
  nodeRect,
  isBoardPlaceTool,
  type BoardCamera,
  type BoardCreateNodeInput,
  type BoardHandle,
  type BoardNode,
  type BoardPersistAdapter,
  type BoardPlaceOpts,
  type BoardSelectionSummary,
  type BoardTool,
} from "@/components/cins/board/board-types";
import { applyAutoLayout } from "@/components/cins/board/auto-layout";
import {
  closestPointOnPoly,
  findWirePortSnap,
  insertWireAnchor,
  nearestWirePort,
  normalizeWireArrow,
  normalizeWireStyle,
  WIRE_ARROWS,
  WIRE_PORT_SNAP_DIST,
  WIRE_SIDES,
  WIRE_STYLES,
  wirePathBetween,
  wirePathDraft,
  wireRouteOptsFromLayout,
  type WireArrow,
  type WirePoint,
  type WireRouteOpts,
  type WireSide,
  type WireStyle,
} from "@/components/cins/board/wire-path";
import {
  useBoardHistory,
  type BoardCommand,
  type BoardLayoutSnapshot,
} from "@/components/cins/board/use-board-history";
import type { CanvasNodeLayout } from "@/lib/chat/canvas/types";
import { hasShareDragData, readShareDragData } from "@/lib/cins/share-drag";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";

const GRID_STEP = 16;
const GRID_FACTOR = 4;
const GRID_MIN_PX = 4;
const GROUP_PAD = 24;
const GROUP_TITLE_H = 34;
/** Tỉ lệ diện tích card chồng lên frame để snap vào nhóm. */
const GROUP_SNAP_OVERLAP = 0.28;
/** Halo (page units) quanh frame — tâm gần mép vẫn có xu hướng vào nhóm. */
const GROUP_SNAP_MARGIN = 36;
/** Đang là con: chỉ rời khi chồng dưới ngưỡng này và tâm ngoài halo. */
const GROUP_SNAP_LEAVE_OVERLAP = 0.2;
/** Halo giữ membership khi rê trong / sát mép nhóm. */
const GROUP_SNAP_LEAVE_MARGIN = 56;
/** Frame không còn con — giữ khung tối thiểu. */
const GROUP_EMPTY_MIN_W = 160;
const GROUP_EMPTY_MIN_H = GROUP_TITLE_H + GROUP_PAD * 2 + 48;
const DRAG_THRESHOLD_PX = 3;
/** Zoom khi đặt ô chữ — trần cố định, không nhân thêm mỗi lần tạo. */
const TEXT_PLACE_ZOOM = 1.2;

function isLocalBoardNodeId(id: string): boolean {
  return id.startsWith("local-");
}

/** Đang gõ trong input/textarea/contenteditable — đừng nuốt Delete/Backspace. */
function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable='true']")) return true;
  const field = target.closest("input, textarea, select");
  if (!(field instanceof HTMLElement)) return false;
  if (field instanceof HTMLInputElement) {
    const type = field.type;
    if (
      type === "button" ||
      type === "checkbox" ||
      type === "color" ||
      type === "file" ||
      type === "hidden" ||
      type === "radio" ||
      type === "range" ||
      type === "reset" ||
      type === "submit"
    ) {
      return false;
    }
  }
  return true;
}

/** Focus nằm trong board hoặc toolbar `.cins-canvas-wrap` (sibling ngoài board). */
function isCanvasKeyboardScope(
  root: HTMLElement,
  target: EventTarget | null,
): boolean {
  const wrap = root.closest(".cins-canvas-wrap") ?? root;
  if (target instanceof Node && wrap.contains(target)) return true;
  const active = document.activeElement;
  return Boolean(active && wrap.contains(active));
}

/** Đọc kích thước tự nhiên của ảnh (blob/URL) — fail → null. */
function readImageNaturalSize(
  src: string,
): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      resolve(w > 0 && h > 0 ? { w, h } : null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const WIRE_STYLE_LABEL: Record<WireStyle, string> = {
  curve: "Cong",
  straight: "Thẳng",
  elbow: "Góc vuông",
};

const WIRE_ARROW_LABEL: Record<WireArrow, string> = {
  end: "Mũi tên đích",
  both: "Hai mũi tên",
  none: "Không mũi tên",
};

const SHAPE_KIND_LABEL: Record<BoardShapeKind, string> = {
  rect: "Chữ nhật",
  ellipse: "Elip",
  diamond: "Thoi",
};

function ShapeKindIcon({ kind }: { kind: BoardShapeKind }) {
  if (kind === "ellipse") {
    return (
      <svg width="16" height="14" viewBox="0 0 24 24" aria-hidden>
        <ellipse
          cx="12"
          cy="12"
          rx="9"
          ry="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
      </svg>
    );
  }
  if (kind === "diamond") {
    return (
      <svg width="16" height="14" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 3 L21 12 L12 21 L3 12 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="14" viewBox="0 0 24 24" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

/** Icon mini trong thanh chọn kiểu dây — path minh họa kiểu đường. */
function WireStyleIcon({ style }: { style: WireStyle }) {
  const d =
    style === "straight"
      ? "M2 12 L22 12"
      : style === "elbow"
        ? "M2 18 L10 18 L10 6 L22 6"
        : "M2 18 C8 18, 10 6, 22 6";
  return (
    <svg width="22" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WireArrowIcon({ arrow }: { arrow: WireArrow }) {
  if (arrow === "none") {
    return (
      <svg width="22" height="14" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M3 12 H21"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (arrow === "both") {
    return (
      <svg width="22" height="14" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M5 12 H19"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path d="M5 12 L9 8 M5 12 L9 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 12 L15 8 M19 12 L15 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 12 H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M15 7 L21 12 L15 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Corner = "nw" | "ne" | "sw" | "se";

type Gesture =
  | {
      type: "pan";
      pointerId: number;
      startClient: { x: number; y: number };
      camStart: BoardCamera;
    }
  | {
      type: "move";
      pointerId: number;
      startClient: { x: number; y: number };
      nodeIds: string[];
      startPos: Map<string, { x: number; y: number }>;
      before: BoardLayoutSnapshot[];
      moved: boolean;
      /** Offset page-space lần move gần nhất — commit khi thả. */
      lastDx: number;
      lastDy: number;
    }
  | {
      type: "resize";
      pointerId: number;
      startClient: { x: number; y: number };
      nodeId: string;
      corner: Corner;
      startRect: { x: number; y: number; w: number; h: number };
      before: BoardLayoutSnapshot[];
      moved: boolean;
    }
  | {
      type: "marquee";
      pointerId: number;
      startPage: { x: number; y: number };
      additive: boolean;
      baseSelection: Set<string>;
    }
  | {
      /** Kéo dây nối từ một node — thả lên node khác để tạo connector. */
      type: "wire";
      pointerId: number;
      fromId: string;
      fromSide: WireSide;
    }
  | {
      /** Kéo neo / điểm giữa / điểm neo của dây đang chọn. */
      type: "wire-handle";
      pointerId: number;
      wireId: string;
      handle: "from" | "to" | "mid" | "anchor";
      /** Index trong `layout.wireAnchors` khi handle === "anchor". */
      anchorIndex?: number;
      before: BoardLayoutSnapshot[];
      moved: boolean;
    }
  | {
      /** Vẽ nét tự do trên nền trống. */
      type: "draw";
      pointerId: number;
      color: string;
      width: number;
      points: Array<{ x: number; y: number }>;
    }
  | {
      /** Tool chữ: thả không kéo = line text; kéo vùng = area text. */
      type: "place-text";
      pointerId: number;
      startPage: { x: number; y: number };
      startClient: { x: number; y: number };
    };

type PinchGesture = {
  ids: [number, number];
  startDist: number;
  startMid: { x: number; y: number };
  camStart: BoardCamera;
};

function clientDist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clientMid(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function touchById(touches: TouchList, id: number): Touch | null {
  for (let i = 0; i < touches.length; i++) {
    const t = touches.item(i);
    if (t && t.identifier === id) return t;
  }
  return null;
}

/** Ngưỡng (page units) để hiện điểm snap trên path. */
const WIRE_SNAP_MAX_DIST = 18;

type SelectionAlignMode =
  | "left"
  | "centerH"
  | "right"
  | "top"
  | "centerV"
  | "bottom";

const SELECTION_ALIGN_ACTIONS: ReadonlyArray<{
  mode: SelectionAlignMode;
  label: string;
  Icon: typeof AlignHorizontalJustifyStart;
}> = [
  { mode: "left", label: "Căn trái", Icon: AlignHorizontalJustifyStart },
  {
    mode: "centerH",
    label: "Căn giữa ngang",
    Icon: AlignHorizontalJustifyCenter,
  },
  { mode: "right", label: "Căn phải", Icon: AlignHorizontalJustifyEnd },
  { mode: "top", label: "Căn trên", Icon: AlignVerticalJustifyStart },
  {
    mode: "centerV",
    label: "Căn giữa dọc",
    Icon: AlignVerticalJustifyCenter,
  },
  { mode: "bottom", label: "Căn dưới", Icon: AlignVerticalJustifyEnd },
];

type SelectionLayerMode = "forward" | "backward" | "front" | "back";

const SELECTION_LAYER_ACTIONS: ReadonlyArray<{
  mode: SelectionLayerMode;
  label: string;
  Icon: typeof ArrowUp;
}> = [
  { mode: "front", label: "Lên trên cùng", Icon: ChevronsUp },
  { mode: "forward", label: "Lên một lớp", Icon: ArrowUp },
  { mode: "backward", label: "Xuống một lớp", Icon: ArrowDown },
  { mode: "back", label: "Xuống dưới cùng", Icon: ChevronsDown },
];

function computeLayerReorder(
  pool: BoardNode[],
  selectedIds: Set<string>,
  direction: SelectionLayerMode,
): Map<string, number> | null {
  if (pool.length < 2) return null;
  const sorted = [...pool].sort(
    (a, b) => (a.layout.z ?? 0) - (b.layout.z ?? 0),
  );
  const indices = sorted
    .map((n, i) => (selectedIds.has(n.id) ? i : -1))
    .filter((i) => i >= 0);
  if (indices.length === 0) return null;

  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);
  let reordered: BoardNode[] | null = null;

  if (direction === "front") {
    reordered = [
      ...sorted.filter((n) => !selectedIds.has(n.id)),
      ...sorted.filter((n) => selectedIds.has(n.id)),
    ];
  } else if (direction === "back") {
    reordered = [
      ...sorted.filter((n) => selectedIds.has(n.id)),
      ...sorted.filter((n) => !selectedIds.has(n.id)),
    ];
  } else if (direction === "forward") {
    if (maxIdx >= sorted.length - 1) return null;
    const next = sorted[maxIdx + 1]!;
    reordered = sorted.filter((_, i) => i !== maxIdx + 1);
    reordered.splice(minIdx, 0, next);
  } else {
    if (minIdx <= 0) return null;
    const prev = sorted[minIdx - 1]!;
    reordered = sorted.filter((_, i) => i !== minIdx - 1);
    reordered.splice(maxIdx, 0, prev);
  }

  if (reordered.every((n, i) => n.id === sorted[i]!.id)) return null;

  const patches = new Map<string, number>();
  reordered.forEach((n, i) => {
    patches.set(n.id, i + 1);
  });
  return patches;
}

/** Theo dõi theme sáng/tối theo `<html data-theme>`. */
function useResolvedTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );
  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

/**
 * Dot grid nền phân cấp theo camera (kiểu Figma/Miro) — vẽ bằng canvas,
 * bước lưới snap theo device pixel để tránh moiré.
 */
function BoardDotGrid({ camera }: { camera: BoardCamera }) {
  const theme = useResolvedTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const paint = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;

      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bg = theme === "dark" ? "#16181d" : "#f7f7f8";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const z = camera.z;
      const baseAlpha = theme === "dark" ? 0.22 : 0.18;
      const dotRgb = theme === "dark" ? "226,232,240" : "15,23,42";

      const t =
        Math.log(GRID_MIN_PX / (GRID_STEP * z)) / Math.log(GRID_FACTOR);
      const level = Math.max(0, Math.ceil(t));
      const frac = Math.min(1, Math.max(0, level - t));
      const eased = frac * frac * (3 - 2 * frac);

      const fineGapRaw = GRID_STEP * GRID_FACTOR ** level * z;
      const fineStep = Math.max(1, Math.round(fineGapRaw * dpr));
      const coarseStep = fineStep * GRID_FACTOR;
      const originX = Math.round(camera.x * z * dpr);
      const originY = Math.round(camera.y * z * dpr);
      const fineDot = Math.max(1, Math.round(dpr));
      const coarseDot = Math.max(fineDot, Math.round(1.25 * dpr));

      const paintLayer = (step: number, alpha: number, size: number) => {
        if (alpha < 0.01) return;
        ctx.fillStyle = `rgba(${dotRgb},${alpha})`;
        let x0 = ((originX % step) + step) % step;
        if (x0 > 0) x0 -= step;
        let y0 = ((originY % step) + step) % step;
        if (y0 > 0) y0 -= step;
        for (let x = x0; x < w; x += step) {
          for (let y = y0; y < h; y += step) {
            ctx.fillRect(x, y, size, size);
          }
        }
      };

      paintLayer(fineStep, baseAlpha * eased, fineDot);
      paintLayer(coarseStep, baseAlpha, coarseDot);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [camera.x, camera.y, camera.z, theme]);

  return (
    <div ref={wrapRef} className="cins-canvas-dots">
      <canvas ref={canvasRef} className="cins-canvas-dots-layer" aria-hidden />
    </div>
  );
}

function centerOf(node: BoardNode): { x: number; y: number } {
  const r = nodeRect(node);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function wirePortCandidates(list: BoardNode[]) {
  return list
    .filter((n) => n.loai !== "connector" && n.loai !== "frame")
    .map((n) => ({ id: n.id, rect: nodeRect(n) }));
}

/** Snap núm nối — ưu tiên trong ngưỡng, fallback port gần nhất trên block đang hover. */
function resolveWirePortSnap(
  list: BoardNode[],
  p: WirePoint,
  excludeId?: string,
  maxDist?: number,
): ReturnType<typeof findWirePortSnap> {
  const dist = maxDist ?? WIRE_PORT_SNAP_DIST;
  const snap = findWirePortSnap(wirePortCandidates(list), p, {
    excludeIds: excludeId ? [excludeId] : [],
    maxDist: dist,
  });
  if (snap) return snap;
  const hit = hitNodeAt(list, p, excludeId);
  if (!hit) return null;
  const port = nearestWirePort(nodeRect(hit), p);
  return {
    nodeId: hit.id,
    side: port.side,
    offset: port.offset,
    point: port.point,
  };
}

function cameraWorldTransform(cam: BoardCamera): string {
  return `scale(${cam.z}) translate(${cam.x}px, ${cam.y}px)`;
}

function hitNodeAt(
  list: BoardNode[],
  p: { x: number; y: number },
  excludeId?: string,
): BoardNode | null {
  let best: BoardNode | null = null;
  let bestScore = -Infinity;
  for (const n of list) {
    if (n.loai === "connector" || n.id === excludeId) continue;
    const r = nodeRect(n);
    if (!pointInRect(p, r)) continue;
    const score = (n.loai === "frame" ? 0 : 1_000_000) + (n.layout.z ?? 0);
    if (score >= bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best;
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

type BoardRect = { x: number; y: number; w: number; h: number };

function pointInRect(p: { x: number; y: number }, r: BoardRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function rectIntersectionArea(a: BoardRect, b: BoardRect): number {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return w * h;
}

function cardOverlapRatio(card: BoardRect, frame: BoardRect): number {
  const area = Math.max(1, card.w * card.h);
  return rectIntersectionArea(card, frame) / area;
}

/** Frame host khi kéo card từ ngoài vào nhóm (tâm trong / chồng đủ / gần mép). */
function findGroupSnapHost(
  card: BoardRect,
  frames: BoardNode[],
): BoardNode | null {
  let best: { frame: BoardNode; score: number } | null = null;
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  for (const frame of frames) {
    const fr = nodeRect(frame);
    const overlap = cardOverlapRatio(card, fr);
    const centerIn = pointInRect({ x: cx, y: cy }, fr);
    const halo: BoardRect = {
      x: fr.x - GROUP_SNAP_MARGIN,
      y: fr.y - GROUP_SNAP_MARGIN,
      w: fr.w + GROUP_SNAP_MARGIN * 2,
      h: fr.h + GROUP_SNAP_MARGIN * 2,
    };
    const nearEdge =
      overlap > 0.08 && pointInRect({ x: cx, y: cy }, halo);
    if (!centerIn && overlap < GROUP_SNAP_OVERLAP && !nearEdge) continue;
    const score =
      (centerIn ? 2 : 0) +
      overlap * 3 +
      (nearEdge ? 0.4 : 0) +
      (frame.layout.z ?? 0) * 0.001;
    if (!best || score > best.score) best = { frame, score };
  }
  return best?.frame ?? null;
}

function inflateRect(r: BoardRect, pad: number): BoardRect {
  return {
    x: r.x - pad,
    y: r.y - pad,
    w: r.w + pad * 2,
    h: r.h + pad * 2,
  };
}

function cardCenter(card: BoardRect): { x: number; y: number } {
  return { x: card.x + card.w / 2, y: card.y + card.h / 2 };
}

/** Còn dính nhóm — chỉ coi là rời khi tâm ngoài halo và chồng rất ít. */
function hasClearlyLeftGroup(card: BoardRect, frame: BoardRect): boolean {
  const overlap = cardOverlapRatio(card, frame);
  if (overlap >= GROUP_SNAP_LEAVE_OVERLAP) return false;
  if (pointInRect(cardCenter(card), inflateRect(frame, GROUP_SNAP_LEAVE_MARGIN))) {
    return false;
  }
  return true;
}

/** Gán / giữ / rời groupId — ưu tiên giữ nhóm hiện tại khi rê bên trong. */
function resolveGroupSnapId(
  card: BoardRect,
  frames: BoardNode[],
  currentGid: string | null,
): string | null {
  const host = findGroupSnapHost(card, frames);
  if (currentGid) {
    const cur = frames.find((f) => f.id === currentGid);
    if (cur && !hasClearlyLeftGroup(card, nodeRect(cur))) {
      if (!host || host.id === currentGid) return currentGid;
      const hostFr = nodeRect(host);
      const curFr = nodeRect(cur);
      const c = cardCenter(card);
      if (
        pointInRect(c, hostFr) &&
        cardOverlapRatio(card, hostFr) > cardOverlapRatio(card, curFr) + 0.15
      ) {
        return host.id;
      }
      return currentGid;
    }
  }
  return host?.id ?? null;
}

/** Nở frame để ôm hết member (chỉ to ra, không thu). */
function frameCoverRect(frame: BoardRect, members: BoardRect[]): BoardRect {
  let { x: minX, y: minY, w, h } = frame;
  let maxX = minX + w;
  let maxY = minY + h;
  for (const r of members) {
    minX = Math.min(minX, r.x - GROUP_PAD);
    minY = Math.min(minY, r.y - GROUP_PAD - GROUP_TITLE_H);
    maxX = Math.max(maxX, r.x + r.w + GROUP_PAD);
    maxY = Math.max(maxY, r.y + r.h + GROUP_PAD);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Co frame ôm sát member còn lại (kéo object ra ngoài). */
function frameFitMembers(
  members: BoardRect[],
  fallback: BoardRect,
): BoardRect {
  if (members.length === 0) {
    return {
      x: fallback.x,
      y: fallback.y,
      w: GROUP_EMPTY_MIN_W,
      h: GROUP_EMPTY_MIN_H,
    };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of members) {
    minX = Math.min(minX, r.x - GROUP_PAD);
    minY = Math.min(minY, r.y - GROUP_PAD - GROUP_TITLE_H);
    maxX = Math.max(maxX, r.x + r.w + GROUP_PAD);
    maxY = Math.max(maxY, r.y + r.h + GROUP_PAD);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function sameBoardRect(a: BoardRect, b: BoardRect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Frame ôm sát toàn bộ block con (kéo / resize). */
function refitParentFrame(list: BoardNode[], childId: string): BoardNode[] {
  const child = list.find((n) => n.id === childId);
  const gid = child?.layout.groupId;
  if (!child || child.loai === "frame" || !gid) return list;
  const frame = list.find((n) => n.id === gid && n.loai === "frame");
  if (!frame) return list;
  const members = list.filter(
    (n) => n.layout.groupId === gid && n.loai !== "frame",
  );
  const cover = frameFitMembers(members.map(nodeRect), nodeRect(frame));
  if (sameBoardRect(cover, nodeRect(frame))) return list;
  return list.map((n) =>
    n.id === gid
      ? {
          ...n,
          layout: {
            ...n.layout,
            x: cover.x,
            y: cover.y,
            w: cover.w,
            h: cover.h,
          },
        }
      : n,
  );
}

function snapshotOf(node: BoardNode): BoardLayoutSnapshot {
  return {
    nodeId: node.id,
    layout: { ...node.layout },
    noiDung: node.noiDung,
  };
}

type CinsBoardProps = {
  nodes: BoardNode[] | null;
  locked: boolean;
  persist: BoardPersistAdapter;
  onJumpToMessage?: (messageId: string) => void;
  onSelectionChange?: (summary: BoardSelectionSummary) => void;
  /** Camera đổi — toolbar hiển thị % zoom. */
  onCameraChange?: (camera: BoardCamera) => void;
  /** Tool đổi (phím tắt V/H) — toolbar highlight nút tương ứng. */
  onToolChange?: (tool: BoardTool) => void;
  /** Upload file ảnh (kéo từ máy / Ctrl+V) — trả URL hiển thị, null nếu lỗi. */
  uploadImage?: (file: File) => Promise<string | null>;
  /** Màu nét khi công cụ vẽ (lấy từ palette toolbar). */
  inkColor?: string;
  /** Node cần zoom tới sau hydrate (mở canvas từ menu tin). */
  pendingFocusNodeId?: string | null;
  /** Node bình luận cần highlight sau hydrate (mở từ tin feed). */
  pendingHighlightNodeIds?: string[] | null;
};

export const CinsBoard = forwardRef<BoardHandle, CinsBoardProps>(
  function CinsBoard(
    {
      nodes: nodesProp,
      locked,
      persist,
      onJumpToMessage,
      onSelectionChange,
      onCameraChange,
      onToolChange,
      uploadImage,
      inkColor = "#1a1a1a",
      pendingFocusNodeId,
      pendingHighlightNodeIds,
    },
    handleRef,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<BoardNode[]>([]);
    const [camera, setCamera] = useState<BoardCamera>({ x: 0, y: 0, z: 1 });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
      kind?: "place";
    } | null>(null);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [panning, setPanning] = useState(false);
    /** Đang kéo/resize node — ẩn thanh thao tác selection cho đỡ nhiễu. */
    const [interacting, setInteracting] = useState(false);
    /** Dây đang kéo dở: từ node → vị trí chuột (page units). */
    const [wireDraft, setWireDraft] = useState<{
      fromId: string;
      fromSide: WireSide;
      x: number;
      y: number;
      targetId?: string | null;
      toSide?: WireSide;
    } | null>(null);
    /** Điểm snap chạy theo path khi rê gần dây đang chọn. */
    const [wireSnap, setWireSnap] = useState<{
      wireId: string;
      x: number;
      y: number;
    } | null>(null);
    /** Click path (đã chọn) → thả không kéo = thêm điểm neo. */
    const wirePathClickRef = useRef<{
      wireId: string;
      pointerId: number;
      startClient: { x: number; y: number };
      point: WirePoint;
    } | null>(null);
    const [tool, setToolState] = useState<BoardTool>("select");
    const [drawDraft, setDrawDraft] = useState<{
      color: string;
      width: number;
      points: Array<{ x: number; y: number }>;
    } | null>(null);
    /** Node ảnh đang upload ngầm (paste/drop) — id tạm `local-img-*`. */
    const [uploadingIds, setUploadingIds] = useState<Set<string>>(
      () => new Set(),
    );
    const [justPlacedIds, setJustPlacedIds] = useState<Set<string>>(
      () => new Set(),
    );
    const justPlacedIdsRef = useRef<Set<string>>(new Set());

    const nodesRef = useRef<BoardNode[]>([]);
    const toolRef = useRef<BoardTool>("select");
    const inkColorRef = useRef(inkColor);
    const cameraRef = useRef(camera);
    const selectedRef = useRef(selectedIds);
    const lockedRef = useRef(locked);
    const spaceHeldRef = useRef(false);
    const editingRef = useRef<string | null>(null);

    useEffect(() => {
      lockedRef.current = locked;
    }, [locked]);
    useEffect(() => {
      editingRef.current = editingId;
    }, [editingId]);
    useEffect(() => {
      justPlacedIdsRef.current = justPlacedIds;
    }, [justPlacedIds]);
    useEffect(() => {
      inkColorRef.current = inkColor;
    }, [inkColor]);

    const gestureRef = useRef<Gesture | null>(null);
    const pinchRef = useRef<PinchGesture | null>(null);
    const hydratedRef = useRef(false);
    const zCounterRef = useRef(1);
    /** Paste/upload bị user xóa giữa chừng — chặn create xong hiện lại. */
    const cancelledLocalIdsRef = useRef<Set<string>>(new Set());
    /** Node chữ local đang sửa — chỉ đổi id DB sau khi blur (tránh remount textarea). */
    const pendingPromoteRef = useRef(new Map<string, BoardNode>());
    const camAnimRafRef = useRef(0);
    const cameraFlushRafRef = useRef(0);
    /** DOM node để kéo mượt (không setState mỗi pointermove). */
    const nodeElByIdRef = useRef(new Map<string, HTMLDivElement>());
    const wireElByIdRef = useRef(new Map<string, SVGGElement>());
    const movePreviewRafRef = useRef(0);
    /** Frame đang là đích snap khi kéo card từ ngoài vào — chỉ đụng DOM. */
    const groupSnapHostRef = useRef<string | null>(null);
    /** Kích thước gốc các frame đã preview nở/co — restore nếu hủy kéo. */
    const groupSnapFrameBoxesRef = useRef(new Map<string, BoardRect>());
    const colorPreviewRafRef = useRef(0);
    const colorPreviewMauRef = useRef<string | null>(null);
    const colorStrokeRef = useRef<{
      before: BoardLayoutSnapshot[];
      mau: string;
    } | null>(null);

    const history = useBoardHistory();

    /* ---------- state commit helpers (ref đồng bộ tức thì) ---------- */

    const commitNodes = useCallback((next: BoardNode[]) => {
      nodesRef.current = next;
      setNodes(next);
    }, []);

    // Wheel events dồn dập giữa hai render — ref phải sync ngay, không chờ effect.
    const commitCamera = useCallback(
      (next: BoardCamera, opts?: { fromAnim?: boolean }) => {
        if (!opts?.fromAnim && camAnimRafRef.current) {
          cancelAnimationFrame(camAnimRafRef.current);
          camAnimRafRef.current = 0;
        }
        cameraRef.current = next;
        const world = worldRef.current;
        if (world) world.style.transform = cameraWorldTransform(next);
        onCameraChange?.(next);
        // Coalesce React state (grid / selbar) — 1 render/frame, không chặn pan/zoom.
        if (cameraFlushRafRef.current) return;
        cameraFlushRafRef.current = requestAnimationFrame(() => {
          cameraFlushRafRef.current = 0;
          setCamera(cameraRef.current);
        });
      },
      [onCameraChange],
    );

    useEffect(() => {
      return () => {
        if (cameraFlushRafRef.current) {
          cancelAnimationFrame(cameraFlushRafRef.current);
          cameraFlushRafRef.current = 0;
        }
        if (camAnimRafRef.current) {
          cancelAnimationFrame(camAnimRafRef.current);
          camAnimRafRef.current = 0;
        }
      };
    }, []);

    useLayoutEffect(() => {
      const world = worldRef.current;
      if (world) world.style.transform = cameraWorldTransform(cameraRef.current);
    }, []);

    const animateCameraTo = useCallback(
      (to: BoardCamera, ms = 340) => {
        if (camAnimRafRef.current) {
          cancelAnimationFrame(camAnimRafRef.current);
          camAnimRafRef.current = 0;
        }
        const from = cameraRef.current;
        if (
          Math.abs(from.x - to.x) < 0.15 &&
          Math.abs(from.y - to.y) < 0.15 &&
          Math.abs(from.z - to.z) < 0.004
        ) {
          return;
        }
        const t0 = performance.now();
        const easeOut = (t: number) => 1 - (1 - t) ** 3;
        const tick = (now: number) => {
          const u = Math.min(1, (now - t0) / ms);
          const e = easeOut(u);
          commitCamera(
            {
              x: from.x + (to.x - from.x) * e,
              y: from.y + (to.y - from.y) * e,
              z: from.z + (to.z - from.z) * e,
            },
            { fromAnim: true },
          );
          if (u < 1) camAnimRafRef.current = requestAnimationFrame(tick);
          else camAnimRafRef.current = 0;
        };
        camAnimRafRef.current = requestAnimationFrame(tick);
      },
      [commitCamera],
    );

    /** Đưa ô chữ vào giữa viewport; zoom chỉ nâng tới TEXT_PLACE_ZOOM, không nhân thêm. */
    const centerTextBoxInView = useCallback(
      (box: { x: number; y: number; w: number; h: number }) => {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;
        const cam = cameraRef.current;
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const nextZ = Math.min(
          BOARD_MAX_ZOOM,
          Math.max(cam.z, TEXT_PLACE_ZOOM),
        );
        const to = {
          x: rect.width / 2 / nextZ - cx,
          y: rect.height / 2 / nextZ - cy,
          z: nextZ,
        };
        if (
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          commitCamera(to);
          return;
        }
        animateCameraTo(to);
      },
      [animateCameraTo, commitCamera],
    );

    const placeOptsRef = useRef<BoardPlaceOpts>({
      mau: STICKY_PALETTE[0],
      shapeKind: "rect",
      rows: 3,
      cols: 3,
    });

    const setTool = useCallback(
      (next: BoardTool, opts?: BoardPlaceOpts) => {
        toolRef.current = next;
        if (opts) {
          placeOptsRef.current = { ...placeOptsRef.current, ...opts };
        }
        setToolState(next);
        onToolChange?.(next);
      },
      [onToolChange],
    );

    const setSelection = useCallback((ids: Set<string>) => {
      selectedRef.current = ids;
      setSelectedIds(ids);
      setWireSnap((prev) => (prev && ids.has(prev.wireId) ? prev : null));
    }, []);

    const byId = useCallback(
      (id: string) => nodesRef.current.find((n) => n.id === id) ?? null,
      [],
    );

    const membersOfFrame = useCallback(
      (frameId: string) =>
        nodesRef.current.filter((n) => n.layout.groupId === frameId),
      [],
    );

    /** Preview kéo: chỉ đụng DOM — React/layout commit khi thả. */
    const applyMovePreview = useCallback(
      (
        nodeIds: string[],
        startPos: Map<string, { x: number; y: number }>,
        dx: number,
        dy: number,
      ) => {
        const idSet = new Set(nodeIds);
        for (const id of nodeIds) {
          const start = startPos.get(id);
          const el = nodeElByIdRef.current.get(id);
          if (!start || !el) continue;
          el.style.transform = `translate(${start.x + dx}px, ${start.y + dy}px)`;
        }

        const liveRect = (n: BoardNode) => {
          const r = nodeRect(n);
          if (!idSet.has(n.id)) return r;
          const start = startPos.get(n.id);
          if (!start) return r;
          return { ...r, x: start.x + dx, y: start.y + dy };
        };

        const liveById = new Map<string, BoardNode>();
        for (const n of nodesRef.current) liveById.set(n.id, n);

        for (const w of nodesRef.current) {
          if (w.loai !== "connector") continue;
          const fromId = w.layout.from;
          const toId = w.layout.to;
          if (!fromId || !toId) continue;
          if (!idSet.has(fromId) && !idSet.has(toId)) continue;
          const a = liveById.get(fromId);
          const b = liveById.get(toId);
          if (!a || !b) continue;
          const path = wirePathBetween(
            liveRect(a),
            liveRect(b),
            normalizeWireStyle(w.layout.wireStyle),
            wireRouteOptsFromLayout(w.layout),
          );
          const gEl = wireElByIdRef.current.get(w.id);
          if (!gEl) continue;
          gEl.querySelectorAll("path.cins-board-wire-hit, path.cins-board-wire-line").forEach(
            (p) => p.setAttribute("d", path.d),
          );
        }
      },
      [],
    );

    const restoreGroupSnapFrameBox = useCallback((onlyId?: string) => {
      const boxes = groupSnapFrameBoxesRef.current;
      const ids = onlyId ? [onlyId] : [...boxes.keys()];
      for (const id of ids) {
        const prev = boxes.get(id);
        if (!prev) continue;
        const el = nodeElByIdRef.current.get(id);
        if (el) {
          el.style.transform = `translate(${prev.x}px, ${prev.y}px)`;
          el.style.width = `${prev.w}px`;
          el.style.height = `${prev.h}px`;
        }
        boxes.delete(id);
      }
    }, []);

    const setGroupSnapHighlight = useCallback((frameId: string | null) => {
      const prev = groupSnapHostRef.current;
      if (prev === frameId) return;
      if (prev) {
        nodeElByIdRef.current.get(prev)?.classList.remove("is-group-snap");
      }
      if (frameId) {
        nodeElByIdRef.current.get(frameId)?.classList.add("is-group-snap");
      }
      groupSnapHostRef.current = frameId;
    }, []);

    const clearGroupSnapUi = useCallback(
      (restoreFrame: boolean) => {
        setGroupSnapHighlight(null);
        if (restoreFrame) restoreGroupSnapFrameBox();
        else groupSnapFrameBoxesRef.current.clear();
      },
      [restoreGroupSnapFrameBox, setGroupSnapHighlight],
    );

    const previewGroupSnapHost = useCallback(
      (g: Extract<Gesture, { type: "move" }>) => {
        const movingIds = new Set(g.nodeIds);
        const movingFrame = nodesRef.current.find(
          (n) => n.loai === "frame" && movingIds.has(n.id),
        );
        if (movingFrame) {
          restoreGroupSnapFrameBox();
          setGroupSnapHighlight(movingFrame.id);
          return;
        }
        const frames = nodesRef.current.filter(
          (n) => n.loai === "frame" && !movingIds.has(n.id),
        );
        const rectsByHost = new Map<string, BoardRect[]>();
        const leftFrameIds = new Set<string>();
        const liveIds = new Set(g.nodeIds);
        for (const id of g.nodeIds) {
          const n = nodesRef.current.find((x) => x.id === id);
          if (!n || n.loai === "frame") continue;
          const start = g.startPos.get(id);
          if (!start) continue;
          const r = {
            ...nodeRect(n),
            x: start.x + g.lastDx,
            y: start.y + g.lastDy,
          };
          const currentGid = n.layout.groupId ?? null;
          const nextGid = resolveGroupSnapId(r, frames, currentGid);
          if (currentGid && currentGid !== nextGid) {
            leftFrameIds.add(currentGid);
          }
          if (!nextGid) continue;
          const list = rectsByHost.get(nextGid) ?? [];
          list.push(r);
          rectsByHost.set(nextGid, list);
        }
        const hostId = rectsByHost.keys().next().value ?? null;
        setGroupSnapHighlight(hostId);

        const desired = new Map<string, BoardRect>();
        for (const [fid, incoming] of rectsByHost) {
          const frame = nodesRef.current.find((n) => n.id === fid);
          if (!frame) continue;
          const base = nodeRect(frame);
          const memberRects = [
            ...nodesRef.current
              .filter(
                (n) =>
                  n.layout.groupId === fid &&
                  n.loai !== "frame" &&
                  !liveIds.has(n.id),
              )
              .map(nodeRect),
            ...incoming,
          ];
          desired.set(fid, frameFitMembers(memberRects, base));
        }
        for (const fid of leftFrameIds) {
          if (desired.has(fid)) continue;
          const frame = nodesRef.current.find((n) => n.id === fid);
          if (!frame) continue;
          const remaining = nodesRef.current
            .filter(
              (n) =>
                n.layout.groupId === fid &&
                n.loai !== "frame" &&
                !liveIds.has(n.id),
            )
            .map(nodeRect);
          desired.set(fid, frameFitMembers(remaining, nodeRect(frame)));
        }

        for (const id of [...groupSnapFrameBoxesRef.current.keys()]) {
          if (!desired.has(id)) restoreGroupSnapFrameBox(id);
        }
        for (const [fid, box] of desired) {
          const frame = nodesRef.current.find((n) => n.id === fid);
          const el = nodeElByIdRef.current.get(fid);
          if (!frame || !el) continue;
          if (!groupSnapFrameBoxesRef.current.has(fid)) {
            groupSnapFrameBoxesRef.current.set(fid, nodeRect(frame));
          }
          el.style.transform = `translate(${box.x}px, ${box.y}px)`;
          el.style.width = `${box.w}px`;
          el.style.height = `${box.h}px`;
        }
      },
      [restoreGroupSnapFrameBox, setGroupSnapHighlight],
    );

    const pageFromClient = useCallback((clientX: number, clientY: number) => {
      const rect = rootRef.current?.getBoundingClientRect();
      const cam = cameraRef.current;
      const sx = clientX - (rect?.left ?? 0);
      const sy = clientY - (rect?.top ?? 0);
      return { x: sx / cam.z - cam.x, y: sy / cam.z - cam.y };
    }, []);

    /** Layout LƯU của node — node thuộc group quy về tọa độ tương đối frame. */
    const toStoredLayout = useCallback(
      (node: BoardNode): CanvasNodeLayout => {
        const layout = { ...node.layout };
        const gid = layout.groupId;
        if (gid && node.loai !== "frame") {
          const frame = nodesRef.current.find(
            (n) => n.id === gid && n.loai === "frame",
          );
          if (frame) {
            layout.x = layout.x - frame.layout.x;
            layout.y = layout.y - frame.layout.y;
          }
        }
        return layout;
      },
      [],
    );

    const persistNodeLayout = useCallback(
      (node: BoardNode, extra?: { noiDung?: string }) => {
        if (isLocalBoardNodeId(node.id)) return;
        void persist.patchNode(node.id, {
          layout: toStoredLayout(node),
          ...(extra?.noiDung !== undefined ? { noiDung: extra.noiDung } : {}),
        });
      },
      [persist, toStoredLayout],
    );

    const persistLayoutBatch = useCallback(
      async (nodesToPersist: BoardNode[]) => {
        const patches = nodesToPersist
          .filter((n) => !isLocalBoardNodeId(n.id))
          .map((n) => ({ nodeId: n.id, layout: toStoredLayout(n) }));
        if (patches.length === 0) return;

        if (patches.length > 1 && persist.patchNodesLayoutBatch) {
          await persist.patchNodesLayoutBatch(patches);
          return;
        }

        for (const patch of patches) {
          await persist.patchNode(patch.nodeId, { layout: patch.layout });
        }
      },
      [persist, toStoredLayout],
    );

    const lastSelectionKeyRef = useRef("");
    const emitSelection = useCallback(() => {
      if (!onSelectionChange) return;
      const sel = [...selectedRef.current]
        .map((id) => nodesRef.current.find((n) => n.id === id))
        .filter((n): n is BoardNode => Boolean(n));
      const frames = sel.filter((n) => n.loai === "frame");
      const cards = sel.filter((n) => n.loai !== "frame");
      const frame = frames.length === 1 && sel.length === 1 ? frames[0]! : null;
      const summary = {
        selectedCount: sel.length,
        cardCount: cards.length,
        frame: frame
          ? {
              nodeId: frame.id,
              name: frame.noiDung ?? "",
              mau: frame.layout.mau ?? GROUP_PALETTE[0]!,
            }
          : null,
        hasSticky: cards.some((n) => n.loai === "sticky"),
        nodeCount: nodesRef.current.length,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      };
      const key = JSON.stringify(summary);
      if (key === lastSelectionKeyRef.current) return;
      lastSelectionKeyRef.current = key;
      onSelectionChange(summary);
    }, [history.canUndo, history.canRedo, onSelectionChange]);

    useEffect(() => {
      emitSelection();
    }, [selectedIds, nodes, emitSelection]);

    /* ---------- camera ---------- */

    const zoomAt = useCallback(
      (clientX: number, clientY: number, factor: number) => {
        const rect = rootRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        const sx = clientX - (rect?.left ?? 0);
        const sy = clientY - (rect?.top ?? 0);
        const nextZ = Math.min(
          BOARD_MAX_ZOOM,
          Math.max(BOARD_MIN_ZOOM, cam.z * factor),
        );
        if (nextZ === cam.z) return;
        const px = sx / cam.z - cam.x;
        const py = sy / cam.z - cam.y;
        commitCamera({ x: sx / nextZ - px, y: sy / nextZ - py, z: nextZ });
      },
      [commitCamera],
    );

    // React gắn wheel passive ở root — cần native listener để preventDefault.
    useEffect(() => {
      const el = rootRef.current;
      if (!el) return;
      const handler = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0024));
          return;
        }
        const cam = cameraRef.current;
        commitCamera({
          x: cam.x - e.deltaX / cam.z,
          y: cam.y - e.deltaY / cam.z,
          z: cam.z,
        });
      };
      el.addEventListener("wheel", handler, { passive: false });
      return () => el.removeEventListener("wheel", handler);
    }, [commitCamera, zoomAt]);

    /** Zoom giữ tâm viewport (nút +/− và về 100%). */
    const zoomAtCenter = useCallback(
      (factor: number, absoluteZ?: number) => {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cam = cameraRef.current;
        const nextZ = Math.min(
          BOARD_MAX_ZOOM,
          Math.max(BOARD_MIN_ZOOM, absoluteZ ?? cam.z * factor),
        );
        if (nextZ === cam.z) return;
        const sx = rect.width / 2;
        const sy = rect.height / 2;
        const px = sx / cam.z - cam.x;
        const py = sy / cam.z - cam.y;
        commitCamera({ x: sx / nextZ - px, y: sy / nextZ - py, z: nextZ });
      },
      [commitCamera],
    );

    const zoomIn = useCallback(() => zoomAtCenter(1.25), [zoomAtCenter]);
    const zoomOut = useCallback(() => zoomAtCenter(1 / 1.25), [zoomAtCenter]);
    const zoomReset = useCallback(() => zoomAtCenter(1, 1), [zoomAtCenter]);

    const zoomToRect = useCallback(
      (target: { x: number; y: number; w: number; h: number }, maxZ = 1) => {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        const pad = 64;
        const z = Math.min(
          maxZ,
          Math.max(
            BOARD_MIN_ZOOM,
            Math.min(
              (rect.width - pad) / Math.max(target.w, 1),
              (rect.height - pad) / Math.max(target.h, 1),
            ),
          ),
        );
        const cx = target.x + target.w / 2;
        const cy = target.y + target.h / 2;
        commitCamera({
          x: rect.width / 2 / z - cx,
          y: rect.height / 2 / z - cy,
          z,
        });
      },
      [commitCamera],
    );

    const zoomToFit = useCallback(() => {
      const list = nodesRef.current.filter((n) => n.loai !== "connector");
      if (list.length === 0) {
        commitCamera({ x: 0, y: 0, z: 1 });
        return;
      }
      const rects = list.map(nodeRect);
      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.x + r.w));
      const maxY = Math.max(...rects.map((r) => r.y + r.h));
      zoomToRect({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
    }, [commitCamera, zoomToRect]);

    const runAutoLayout = useCallback(
      (scope: "board" | "selection") => {
        void (async () => {
          if (lockedRef.current) return;
          const current = nodesRef.current;
          const onlyIds =
            scope === "selection"
              ? new Set(
                  [...selectedRef.current].filter((id) => {
                    const n = current.find((x) => x.id === id);
                    return n && n.loai !== "connector";
                  }),
                )
              : undefined;
          if (scope === "selection" && (!onlyIds || onlyIds.size === 0)) return;
          const layoutable = current.filter((n) => n.loai !== "connector");
          if (layoutable.length === 0) return;
          const next = applyAutoLayout(
            current,
            onlyIds ? { onlyIds } : undefined,
          );
          const beforeById = new Map(
            layoutable.map((n) => [n.id, n.layout] as const),
          );
          const changed = next.filter((n) => {
            if (n.loai === "connector") return false;
            const prev = beforeById.get(n.id);
            if (!prev) return true;
            return (
              prev.x !== n.layout.x ||
              prev.y !== n.layout.y ||
              prev.w !== n.layout.w ||
              prev.h !== n.layout.h
            );
          });
          if (changed.length === 0) return;
          const changedIds = new Set(changed.map((n) => n.id));
          const before = current
            .filter((n) => changedIds.has(n.id))
            .map(snapshotOf);
          commitNodes(next);
          const after = next
            .filter((n) => changedIds.has(n.id))
            .map(snapshotOf);
          history.push({ type: "layout", before, after });
          await persistLayoutBatch(
            next.filter((n) => changedIds.has(n.id) && !isLocalBoardNodeId(n.id)),
          );
          if (scope === "board") {
            requestAnimationFrame(() => zoomToFit());
          }
          emitSelection();
        })();
      },
      [commitNodes, emitSelection, history, persistLayoutBatch, zoomToFit],
    );

    const autoLayout = useCallback(() => {
      runAutoLayout("board");
    }, [runAutoLayout]);

    const autoLayoutSelection = useCallback(() => {
      runAutoLayout("selection");
    }, [runAutoLayout]);

    const zoomToNode = useCallback(
      (node: BoardNode) => {
        zoomToRect(nodeRect(node), Math.max(1, cameraRef.current.z));
      },
      [zoomToRect],
    );

    /* ---------- history execution ---------- */

    const applySnapshots = useCallback(
      (snapshots: BoardLayoutSnapshot[]) => {
        if (snapshots.length === 0) return;
        const map = new Map(snapshots.map((s) => [s.nodeId, s]));
        const next = nodesRef.current.map((n) => {
          const snap = map.get(n.id);
          if (!snap) return n;
          return { ...n, layout: { ...snap.layout }, noiDung: snap.noiDung };
        });
        commitNodes(next);
        for (const n of next) {
          const snap = map.get(n.id);
          if (!snap) continue;
          void persist.patchNode(n.id, {
            layout: toStoredLayout(n),
            noiDung: snap.noiDung ?? "",
          });
        }
      },
      [commitNodes, persist, toStoredLayout],
    );

    const runCommand = useCallback(
      async (cmd: BoardCommand, direction: "undo" | "redo") => {
        if (cmd.type === "layout") {
          applySnapshots(direction === "undo" ? cmd.before : cmd.after);
          return;
        }

        const removeNodeLocal = (nodeId: string) => {
          commitNodes(nodesRef.current.filter((n) => n.id !== nodeId));
          setSelection(new Set());
        };
        const addNodeLocal = (node: BoardNode) => {
          commitNodes([...nodesRef.current, node]);
        };

        if (cmd.type === "create") {
          if (direction === "undo") {
            removeNodeLocal(cmd.node.id);
            void persist.deleteNode(cmd.node);
          } else {
            const created = await persist.recreateNode({
              ...cmd.node,
              layout: toStoredLayout(cmd.node),
            });
            if (created) {
              history.remapNodeId(cmd.node.id, created.id);
              addNodeLocal({ ...cmd.node, id: created.id });
            }
          }
          return;
        }

        if (cmd.type === "delete") {
          if (direction === "undo") {
            const created = await persist.recreateNode({
              ...cmd.node,
              layout: toStoredLayout(cmd.node),
            });
            if (created) {
              history.remapNodeId(cmd.node.id, created.id);
              addNodeLocal({ ...cmd.node, id: created.id });
            }
          } else {
            removeNodeLocal(cmd.node.id);
            void persist.deleteNode(cmd.node);
          }
          return;
        }

        // group / ungroup — đối xứng: một chiều tạo frame, chiều kia xóa.
        const shouldCreateFrame =
          cmd.type === "group" ? direction === "redo" : direction === "undo";
        if (shouldCreateFrame) {
          const created = await persist.recreateNode(cmd.frame);
          if (!created) return;
          history.remapNodeId(cmd.frame.id, created.id);
          addNodeLocal({ ...cmd.frame, id: created.id });
          applySnapshots(cmd.type === "group" ? cmd.after : cmd.before);
        } else {
          removeNodeLocal(cmd.frame.id);
          void persist.deleteNode(cmd.frame);
          applySnapshots(cmd.type === "group" ? cmd.before : cmd.after);
        }
      },
      [
        applySnapshots,
        commitNodes,
        history,
        persist,
        setSelection,
        toStoredLayout,
      ],
    );

    const undo = useCallback(() => {
      const cmd = history.popUndo();
      if (cmd) void runCommand(cmd, "undo").then(emitSelection);
    }, [emitSelection, history, runCommand]);

    const redo = useCallback(() => {
      const cmd = history.popRedo();
      if (cmd) void runCommand(cmd, "redo").then(emitSelection);
    }, [emitSelection, history, runCommand]);

    /* ---------- node CRUD từ toolbar / bridge ---------- */

    const addNodeInternal = useCallback(
      (node: BoardNode, pushHistory: boolean) => {
        const withZ: BoardNode = {
          ...node,
          layout: { ...node.layout, z: ++zCounterRef.current },
        };
        commitNodes([...nodesRef.current, withZ]);
        setSelection(new Set([withZ.id]));
        if (pushHistory) {
          history.push({ type: "create", node: withZ });
        }
        emitSelection();
        requestAnimationFrame(() => zoomToNode(withZ));
      },
      [commitNodes, emitSelection, history, setSelection, zoomToNode],
    );

    const markJustPlaced = useCallback((id: string) => {
      justPlacedIdsRef.current = new Set(justPlacedIdsRef.current).add(id);
      setJustPlacedIds(new Set(justPlacedIdsRef.current));
      // Comment cần lâu hơn chữ thường — user kịp focus + gõ.
      window.setTimeout(() => {
        if (!justPlacedIdsRef.current.has(id)) return;
        const next = new Set(justPlacedIdsRef.current);
        next.delete(id);
        justPlacedIdsRef.current = next;
        setJustPlacedIds(next);
      }, 3000);
    }, []);

    const promoteLocalNode = useCallback(
      (tempId: string, created: BoardNode) => {
        const latest = nodesRef.current.find((n) => n.id === tempId);
        pendingPromoteRef.current.delete(tempId);
        if (!latest) {
          void persist.deleteNode(created);
          return;
        }
        // Chỉ xóa sticky chữ trống khi đã thoát soạn. Comment trống giữ lại
        // để user kịp gõ — discardBlank dọn sau.
        if (
          isTextStickyNode(latest) &&
          !isCommentNode(latest) &&
          !(latest.noiDung ?? "").trim() &&
          editingRef.current !== tempId
        ) {
          void persist.deleteNode(created);
          commitNodes(nodesRef.current.filter((n) => n.id !== tempId));
          if (selectedRef.current.has(tempId)) setSelection(new Set());
          emitSelection();
          return;
        }
        const finalNode: BoardNode = {
          ...created,
          layout: {
            ...created.layout,
            ...latest.layout,
            // Giữ author từ server nếu optimistic chưa có.
            ...(created.layout.commentAuthor && !latest.layout.commentAuthor
              ? { commentAuthor: created.layout.commentAuthor }
              : {}),
          },
          noiDung: latest.noiDung,
        };
        commitNodes(
          nodesRef.current.map((n) => (n.id === tempId ? finalNode : n)),
        );
        history.push({ type: "create", node: finalNode });
        if (selectedRef.current.has(tempId)) {
          setSelection(new Set([finalNode.id]));
        }
        if (editingRef.current === tempId) {
          editingRef.current = finalNode.id;
          setEditingId(finalNode.id);
          // Giữ justPlaced qua đổi id để grace xóa trống vẫn đúng.
          if (justPlacedIdsRef.current.has(tempId)) {
            const next = new Set(justPlacedIdsRef.current);
            next.delete(tempId);
            next.add(finalNode.id);
            justPlacedIdsRef.current = next;
            setJustPlacedIds(next);
          }
        }
        const layoutChanged =
          latest.layout.x !== created.layout.x ||
          latest.layout.y !== created.layout.y ||
          latest.layout.w !== created.layout.w ||
          latest.layout.h !== created.layout.h;
        if ((latest.noiDung ?? "") !== (created.noiDung ?? "") || layoutChanged) {
          void persist.patchNode(finalNode.id, {
            layout: toStoredLayout(finalNode),
            noiDung: latest.noiDung ?? "",
          });
        }
        emitSelection();
      },
      [commitNodes, emitSelection, history, persist, setSelection, toStoredLayout],
    );

    const pageOrViewport = useCallback(
      (page: { x: number; y: number } | undefined, w: number, h: number) => {
        if (page) return { x: page.x, y: page.y };
        const rect = rootRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        const cx = (rect?.width ?? 800) / 2 / cam.z - cam.x;
        const cy = (rect?.height ?? 600) / 2 / cam.z - cam.y;
        return { x: cx - w / 2, y: cy - h / 2 };
      },
      [],
    );

    const spawnOptimisticSticky = useCallback(
      (input: BoardCreateNodeInput, opts?: { center?: boolean }) => {
        if (lockedRef.current) return;
        const tempId = `local-place-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const canvasId =
          nodesRef.current.find((n) => n.canvasId)?.canvasId ?? "";
        const now = new Date().toISOString();
        const layout = {
          ...input.layout,
          z: ++zCounterRef.current,
        };
        const optimistic: BoardNode = {
          id: tempId,
          canvasId,
          loai: input.loai,
          messageId: input.messageId ?? null,
          url: input.url ?? null,
          noiDung: input.noiDung ?? "",
          layout,
          idNguoiTao: "",
          taoLuc: now,
          capNhatLuc: now,
        };
        commitNodes([...nodesRef.current, optimistic]);
        setSelection(new Set([tempId]));
        // Sync ref ngay — createNode có thể xong trước useEffect editingId.
        editingRef.current = tempId;
        setEditingId(tempId);
        markJustPlaced(tempId);
        emitSelection();
        if (opts?.center !== false) {
          centerTextBoxInView({
            x: layout.x,
            y: layout.y,
            w: layout.w ?? 160,
            h: layout.h ?? 80,
          });
        }

        void (async () => {
          const created = await persist.createNode(input);
          const gone =
            cancelledLocalIdsRef.current.has(tempId) ||
            !nodesRef.current.some((n) => n.id === tempId);
          if (!created) {
            if (!gone) {
              commitNodes(nodesRef.current.filter((n) => n.id !== tempId));
              if (selectedRef.current.has(tempId)) setSelection(new Set());
              if (editingRef.current === tempId) setEditingId(null);
              emitSelection();
            }
            cancelledLocalIdsRef.current.delete(tempId);
            return;
          }
          if (gone) {
            void persist.deleteNode(created);
            cancelledLocalIdsRef.current.delete(tempId);
            return;
          }
          if (editingRef.current === tempId) {
            pendingPromoteRef.current.set(tempId, created);
            // Hiện tên/avatar thật ngay khi server trả về, không đợi blur.
            if (created.layout.commentAuthor) {
              commitNodes(
                nodesRef.current.map((n) =>
                  n.id === tempId
                    ? {
                        ...n,
                        canvasId: created.canvasId || n.canvasId,
                        layout: {
                          ...n.layout,
                          commentAuthor: created.layout.commentAuthor,
                        },
                      }
                    : n,
                ),
              );
            }
            return;
          }
          promoteLocalNode(tempId, created);
        })();
      },
      [
        centerTextBoxInView,
        commitNodes,
        emitSelection,
        markJustPlaced,
        persist,
        promoteLocalNode,
        setSelection,
      ],
    );

    const addSticky = useCallback(
      (mau: string, page?: { x: number; y: number }) => {
        if (lockedRef.current) return;
        const isText = mau === TEXT_STICKY_MAU;
        const fit = isText
          ? measureFitTextSize("", DEFAULT_TEXT_SIZE)
          : { w: 240, h: 200 };
        const { x, y } = pageOrViewport(page, fit.w, fit.h);
        spawnOptimisticSticky({
          loai: "sticky",
          layout: {
            x,
            y,
            w: fit.w,
            h: fit.h,
            mau,
            ...(isText ? { textKind: "fit" as const } : {}),
          },
          noiDung: "",
        });
      },
      [pageOrViewport, spawnOptimisticSticky],
    );

    const addAreaText = useCallback(
      (rect: { x: number; y: number; w: number; h: number }) => {
        if (lockedRef.current) return;
        spawnOptimisticSticky(
          {
            loai: "sticky",
            layout: {
              x: rect.x,
              y: rect.y,
              w: Math.max(32, rect.w),
              h: Math.max(28, rect.h),
              mau: TEXT_STICKY_MAU,
              textKind: "area",
            },
            noiDung: "",
          },
          { center: false },
        );
      },
      [spawnOptimisticSticky],
    );

    const addText = useCallback(
      () => addSticky(TEXT_STICKY_MAU),
      [addSticky],
    );

    const addShape = useCallback(
      (
        mau: string,
        kind: BoardShapeKind = "rect",
        page?: { x: number; y: number },
      ) => {
        if (lockedRef.current) return;
        const w = 160;
        const h = 160;
        const { x, y } = pageOrViewport(page, w, h);
        spawnOptimisticSticky({
          loai: "sticky",
          layout: { x, y, w, h, mau, shapeKind: kind },
          noiDung: "",
        });
      },
      [pageOrViewport, spawnOptimisticSticky],
    );

    const addTable = useCallback(
      (rows = 3, cols = 3, page?: { x: number; y: number }) => {
        if (lockedRef.current) return;
        const table = createEmptyTable(rows, cols);
        const size = suggestTableSize(table);
        const { x, y } = pageOrViewport(page, size.w, size.h);
        spawnOptimisticSticky({
          loai: "sticky",
          layout: {
            x,
            y,
            w: size.w,
            h: size.h,
            contentKind: "table",
          },
          noiDung: serializeTable(table),
        });
      },
      [pageOrViewport, spawnOptimisticSticky],
    );

    const addComment = useCallback(
      (page?: { x: number; y: number }) => {
        if (lockedRef.current) return;
        const w = BOARD_COMMENT_MIN_W + 40;
        const h = BOARD_COMMENT_MIN_H + 8;
        const { x, y } = pageOrViewport(page, w, h);
        spawnOptimisticSticky({
          loai: "sticky",
          layout: { x, y, w, h, contentKind: "comment" },
          noiDung: "",
        });
      },
      [pageOrViewport, spawnOptimisticSticky],
    );

    const placeArmedAtPage = useCallback(
      (page: { x: number; y: number }) => {
        const armed = toolRef.current;
        const opts = placeOptsRef.current;
        const mau = opts.mau ?? STICKY_PALETTE[0]!;
        if (armed === "text") addSticky(TEXT_STICKY_MAU, page);
        else if (armed === "sticky") addSticky(mau, page);
        else if (armed === "shape") {
          addShape(mau, opts.shapeKind ?? "rect", page);
        } else if (armed === "table") {
          addTable(opts.rows ?? 3, opts.cols ?? 3, page);
        } else if (armed === "comment") addComment(page);
      },
      [addComment, addShape, addSticky, addTable],
    );

    const [highlightIds, setHighlightIds] = useState<Set<string>>(
      () => new Set(),
    );

    const highlightNodes = useCallback((nodeIds: string[]) => {
      const ids = nodeIds.filter(Boolean);
      if (ids.length === 0) return;
      const set = new Set(ids);
      setHighlightIds(set);
      setSelection(set);
      emitSelection();
      const first = nodesRef.current.find((n) => set.has(n.id));
      if (first) zoomToNode(first);
      window.setTimeout(() => {
        setHighlightIds((prev) => {
          if (prev.size === 0) return prev;
          return new Set();
        });
      }, 4200);
    }, [emitSelection, setSelection, zoomToNode]);

    const ingestNode = useCallback(
      (node: BoardNode) => {
        const existing = nodesRef.current.find((n) => n.id === node.id);
        if (existing) {
          const merged: BoardNode = {
            ...existing,
            ...node,
            layout: { ...existing.layout, ...node.layout },
          };
          // commitNodes — giữ nodesRef đồng bộ (setNodes thuần sẽ lệch ref).
          commitNodes(
            nodesRef.current.map((n) => (n.id === node.id ? merged : n)),
          );
          highlightNodes([merged.id]);
          return;
        }
        addNodeInternal(node, false);
        highlightNodes([node.id]);
      },
      [addNodeInternal, commitNodes, highlightNodes],
    );

    /* ---------- nối dây (connector) ---------- */

    const createWire = useCallback(
      async (fromId: string, toId: string, route: WireRouteOpts = {}) => {
        if (lockedRef.current || fromId === toId) return;
        // Đã có dây giữa hai node (bất kể chiều) — không tạo trùng.
        const dup = nodesRef.current.some(
          (n) =>
            n.loai === "connector" &&
            ((n.layout.from === fromId && n.layout.to === toId) ||
              (n.layout.from === toId && n.layout.to === fromId)),
        );
        if (dup) return;

        const layout = {
          x: 0,
          y: 0,
          from: fromId,
          to: toId,
          ...(route.fromSide ? { wireFromSide: route.fromSide } : {}),
          ...(route.toSide ? { wireToSide: route.toSide } : {}),
          ...(route.fromOffset != null
            ? { wireFromOffset: route.fromOffset }
            : {}),
          ...(route.toOffset != null ? { wireToOffset: route.toOffset } : {}),
        };

        /* Hiện dây ngay — không chờ API (tránh delay 2–3s). */
        const tempId = `local-wire-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const canvasId =
          nodesRef.current.find((n) => n.canvasId)?.canvasId ?? "";
        const now = new Date().toISOString();
        const optimistic: BoardNode = {
          id: tempId,
          canvasId,
          loai: "connector",
          messageId: null,
          url: null,
          noiDung: null,
          layout,
          idNguoiTao: "",
          taoLuc: now,
          capNhatLuc: now,
        };
        commitNodes([...nodesRef.current, optimistic]);
        setSelection(new Set([tempId]));
        emitSelection();

        const created = await persist.createNode({
          loai: "connector",
          layout,
        });
        if (!created) {
          commitNodes(nodesRef.current.filter((n) => n.id !== tempId));
          setSelection(new Set());
          emitSelection();
          return;
        }
        const node: BoardNode = {
          ...created,
          layout: { ...created.layout, ...layout },
        };
        commitNodes(
          nodesRef.current.map((n) => (n.id === tempId ? node : n)),
        );
        history.push({ type: "create", node });
        setSelection(new Set([node.id]));
        emitSelection();
      },
      [commitNodes, emitSelection, history, persist, setSelection],
    );

    const startWire = useCallback(
      (e: ReactPointerEvent, nodeId: string, fromSide: WireSide) => {
        if (lockedRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const node = byId(nodeId);
        if (!node) return;
        const p = pageFromClient(e.clientX, e.clientY);
        gestureRef.current = {
          type: "wire",
          pointerId: e.pointerId,
          fromId: nodeId,
          fromSide,
        };
        setWireDraft({ fromId: nodeId, fromSide, x: p.x, y: p.y });
        setInteracting(true);
        rootRef.current?.focus({ preventScroll: true });
        rootRef.current?.setPointerCapture?.(e.pointerId);
      },
      [byId, pageFromClient],
    );

    const startWireHandle = useCallback(
      (
        e: ReactPointerEvent,
        wireId: string,
        handle: "from" | "to" | "mid" | "anchor",
        anchorIndex?: number,
      ) => {
        if (lockedRef.current) return;
        e.stopPropagation();
        e.preventDefault();
        wirePathClickRef.current = null;
        setWireSnap(null);
        const wire = byId(wireId);
        if (!wire || wire.loai !== "connector") return;
        gestureRef.current = {
          type: "wire-handle",
          pointerId: e.pointerId,
          wireId,
          handle,
          ...(handle === "anchor" && anchorIndex != null
            ? { anchorIndex }
            : {}),
          before: [snapshotOf(wire)],
          moved: false,
        };
        setInteracting(true);
        rootRef.current?.focus({ preventScroll: true });
        rootRef.current?.setPointerCapture?.(e.pointerId);
      },
      [byId],
    );

    const addWireAnchorAt = useCallback(
      (wireId: string, point: WirePoint) => {
        if (lockedRef.current) return;
        const wire = byId(wireId);
        if (!wire || wire.loai !== "connector") return;
        const fromId = wire.layout.from;
        const toId = wire.layout.to;
        const a = fromId ? byId(fromId) : null;
        const b = toId ? byId(toId) : null;
        if (!a || !b) return;
        const path = wirePathBetween(
          nodeRect(a),
          nodeRect(b),
          normalizeWireStyle(wire.layout.wireStyle),
          wireRouteOptsFromLayout(wire.layout),
        );
        const existing = path.anchors;
        const nextAnchors = insertWireAnchor(
          existing,
          path.from,
          path.to,
          point,
        );
        if (!nextAnchors) return;
        const before = [snapshotOf(wire)];
        const next = nodesRef.current.map((n) =>
          n.id === wireId
            ? {
                ...n,
                layout: {
                  ...n.layout,
                  wireAnchors: nextAnchors,
                  wireMid: null,
                },
              }
            : n,
        );
        commitNodes(next);
        const updated = next.find((n) => n.id === wireId);
        if (updated) {
          history.push({
            type: "layout",
            before,
            after: [snapshotOf(updated)],
          });
          persistNodeLayout(updated);
        }
        setWireSnap(null);
      },
      [byId, commitNodes, history, persistNodeLayout],
    );

    const applyColorToSelection = useCallback(
      (mau: string) => {
        if (lockedRef.current) return;
        const targets = nodesRef.current.filter(
          (n) =>
            selectedRef.current.has(n.id) &&
            (n.loai === "sticky" || n.loai === "frame"),
        );
        if (targets.length === 0) return;
        const before = targets.map(snapshotOf);
        const next = nodesRef.current.map((n) => {
          if (!selectedRef.current.has(n.id)) return n;
          if (n.loai !== "sticky" && n.loai !== "frame") return n;
          if (normalizeContentKind(n.layout.contentKind) === "draw") {
            const data = parseDraw(n.noiDung);
            if (data) {
              return {
                ...n,
                layout: { ...n.layout, mau },
                noiDung: serializeDraw({ ...data, color: mau }),
              };
            }
          }
          if (n.loai === "sticky" && isTextStickyNode(n)) {
            return {
              ...n,
              layout: { ...n.layout, mau: TEXT_STICKY_MAU, textColor: mau },
            };
          }
          return { ...n, layout: { ...n.layout, mau } };
        });
        commitNodes(next);
        const after = before.map((s) => {
          const n = next.find((x) => x.id === s.nodeId)!;
          return snapshotOf(n);
        });
        history.push({ type: "layout", before, after });
        const layoutOnly: BoardNode[] = [];
        for (const n of next) {
          if (!selectedRef.current.has(n.id)) continue;
          if (n.loai !== "sticky" && n.loai !== "frame") continue;
          if (normalizeContentKind(n.layout.contentKind) === "draw") {
            void persist.patchNode(n.id, {
              layout: n.layout,
              noiDung: n.noiDung ?? undefined,
            });
          } else {
            layoutOnly.push(n);
          }
        }
        void persistLayoutBatch(layoutOnly);
        emitSelection();
      },
      [commitNodes, emitSelection, history, persist, persistLayoutBatch],
    );

    const paintSelectionColorDom = useCallback((mau: string) => {
      for (const id of selectedRef.current) {
        const n = nodesRef.current.find((x) => x.id === id);
        const el = nodeElByIdRef.current.get(id);
        if (!n || !el) continue;
        if (n.loai === "sticky" && isTextStickyNode(n)) {
          el
            .querySelectorAll<HTMLElement>(
              ".cins-canvas-sticky-text, .cins-canvas-sticky-editor",
            )
            .forEach((node) => {
              node.style.color = mau;
            });
          continue;
        }
        if (n.loai === "frame") {
          const card = el.querySelector<HTMLElement>(".cins-canvas-card-frame");
          if (card) card.style.background = mau;
          continue;
        }
        if (n.loai !== "sticky") continue;
        if (normalizeContentKind(n.layout.contentKind) === "draw") {
          el.querySelectorAll<SVGElement>("path").forEach((path) => {
            path.setAttribute("stroke", mau);
          });
          continue;
        }
        const fill = el.querySelector<HTMLElement>(
          ".cins-canvas-shape-fill, .cins-canvas-card-sticky",
        );
        if (fill) fill.style.background = mau;
        if (fill) fill.style.backgroundColor = mau;
      }
    }, []);

    const previewColorOnSelection = useCallback(
      (mau: string) => {
        if (lockedRef.current) return;
        if (!colorStrokeRef.current) {
          const targets = nodesRef.current.filter(
            (n) =>
              selectedRef.current.has(n.id) &&
              (n.loai === "sticky" || n.loai === "frame"),
          );
          if (targets.length === 0) return;
          colorStrokeRef.current = {
            before: targets.map(snapshotOf),
            mau,
          };
        } else {
          colorStrokeRef.current.mau = mau;
        }
        colorPreviewMauRef.current = mau;
        if (colorPreviewRafRef.current) return;
        colorPreviewRafRef.current = requestAnimationFrame(() => {
          colorPreviewRafRef.current = 0;
          const next = colorPreviewMauRef.current;
          if (next) paintSelectionColorDom(next);
        });
      },
      [paintSelectionColorDom],
    );

    const commitPreviewedSelectionColor = useCallback(
      (mau: string) => {
        if (colorPreviewRafRef.current) {
          cancelAnimationFrame(colorPreviewRafRef.current);
          colorPreviewRafRef.current = 0;
        }
        const stroke = colorStrokeRef.current;
        colorStrokeRef.current = null;
        colorPreviewMauRef.current = null;
        if (lockedRef.current) return;
        if (stroke && stroke.mau === mau) {
          const unchanged = stroke.before.every((s) => {
            const n = nodesRef.current.find((x) => x.id === s.nodeId);
            if (!n) return false;
            if (n.loai === "sticky" && isTextStickyNode(n)) {
              return (n.layout.textColor ?? "") === mau;
            }
            return (n.layout.mau ?? "") === mau;
          });
          if (unchanged) return;
        }
        applyColorToSelection(mau);
      },
      [applyColorToSelection],
    );

    const applyTextSizeToSelection = useCallback(
      (textSize: number) => {
        if (lockedRef.current) return;
        const size = normalizeTextSize(textSize);
        const targetIds = new Set(
          nodesRef.current
            .filter(
              (n) =>
                selectedRef.current.has(n.id) &&
                isTextStickyNode(n) &&
                !isAreaTextNode(n),
            )
            .map((n) => n.id),
        );
        if (targetIds.size === 0) return;
        const before = nodesRef.current
          .filter((n) => targetIds.has(n.id))
          .map(snapshotOf);
        const next = nodesRef.current.map((n) => {
          if (!targetIds.has(n.id)) return n;
          const box = measureFitTextSize(n.noiDung ?? "", size);
          return {
            ...n,
            layout: { ...n.layout, textSize: size, w: box.w, h: box.h },
          };
        });
        commitNodes(next);
        const after = next.filter((n) => targetIds.has(n.id)).map(snapshotOf);
        history.push({ type: "layout", before, after });
        void persistLayoutBatch(next.filter((n) => targetIds.has(n.id)));
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistLayoutBatch],
    );

    const alignSelection = useCallback(
      (mode: SelectionAlignMode) => {
        if (lockedRef.current) return;
        const targets = nodesRef.current.filter(
          (n) =>
            selectedRef.current.has(n.id) &&
            n.loai !== "connector" &&
            n.loai !== "frame",
        );
        if (targets.length < 2) return;
        const rects = targets.map((n) => ({ id: n.id, ...nodeRect(n) }));
        const minX = Math.min(...rects.map((r) => r.x));
        const minY = Math.min(...rects.map((r) => r.y));
        const maxX = Math.max(...rects.map((r) => r.x + r.w));
        const maxY = Math.max(...rects.map((r) => r.y + r.h));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        const before = targets.map(snapshotOf);
        const next = nodesRef.current.map((n) => {
          if (!selectedRef.current.has(n.id)) return n;
          if (n.loai === "connector" || n.loai === "frame") return n;
          const r = nodeRect(n);
          let x = r.x;
          let y = r.y;
          switch (mode) {
            case "left":
              x = minX;
              break;
            case "centerH":
              x = midX - r.w / 2;
              break;
            case "right":
              x = maxX - r.w;
              break;
            case "top":
              y = minY;
              break;
            case "centerV":
              y = midY - r.h / 2;
              break;
            case "bottom":
              y = maxY - r.h;
              break;
          }
          return { ...n, layout: { ...n.layout, x, y } };
        });
        commitNodes(next);
        const after = before.map((s) => {
          const n = next.find((x) => x.id === s.nodeId)!;
          return snapshotOf(n);
        });
        history.push({ type: "layout", before, after });
        void persistLayoutBatch(
          next.filter(
            (n) =>
              selectedRef.current.has(n.id) &&
              n.loai !== "connector" &&
              n.loai !== "frame",
          ),
        );
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistLayoutBatch],
    );

    const reorderSelectionLayer = useCallback(
      (direction: SelectionLayerMode) => {
        if (lockedRef.current) return;

        const buildPoolPatch = (isFrame: boolean) => {
          const filter = isFrame
            ? (n: BoardNode) => n.loai === "frame"
            : (n: BoardNode) =>
                n.loai !== "frame" && n.loai !== "connector";
          const pool = nodesRef.current.filter(filter);
          const selIds = new Set(
            pool
              .filter((n) => selectedRef.current.has(n.id))
              .map((n) => n.id),
          );
          if (selIds.size === 0) return null;
          return computeLayerReorder(pool, selIds, direction);
        };

        const framePatches = buildPoolPatch(true);
        const cardPatches = buildPoolPatch(false);
        if (!framePatches && !cardPatches) return;

        const allPatchIds = new Set<string>();
        for (const patches of [framePatches, cardPatches]) {
          if (!patches) continue;
          for (const id of patches.keys()) allPatchIds.add(id);
        }

        const before = nodesRef.current
          .filter((n) => allPatchIds.has(n.id))
          .map(snapshotOf);

        const next = nodesRef.current.map((n) => {
          const z = framePatches?.get(n.id) ?? cardPatches?.get(n.id);
          if (z === undefined) return n;
          return { ...n, layout: { ...n.layout, z } };
        });

        commitNodes(next);
        const after = before.map((s) => {
          const node = next.find((x) => x.id === s.nodeId)!;
          return snapshotOf(node);
        });
        history.push({ type: "layout", before, after });
        zCounterRef.current =
          Math.max(0, ...next.map((n) => n.layout.z ?? 0)) + 1;
        void persistLayoutBatch(next.filter((n) => allPatchIds.has(n.id)));
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistLayoutBatch],
    );

    const patchSelectedWires = useCallback(
      (
        patch: Partial<
          Pick<NonNullable<BoardNode["layout"]>, "wireStyle" | "wireArrow">
        >,
      ) => {
        if (lockedRef.current) return;
        const targetIds = new Set(
          nodesRef.current
            .filter(
              (n) =>
                selectedRef.current.has(n.id) && n.loai === "connector",
            )
            .map((n) => n.id),
        );
        if (targetIds.size === 0) return;
        const before = nodesRef.current
          .filter((n) => targetIds.has(n.id))
          .map(snapshotOf);
        const next = nodesRef.current.map((n) =>
          targetIds.has(n.id)
            ? { ...n, layout: { ...n.layout, ...patch } }
            : n,
        );
        commitNodes(next);
        const after = before.map((s) => ({
          ...s,
          layout: { ...s.layout, ...patch },
        }));
        history.push({ type: "layout", before, after });
        void persistLayoutBatch(next.filter((n) => targetIds.has(n.id)));
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistLayoutBatch],
    );

    const applyWireStyleToSelection = useCallback(
      (wireStyle: WireStyle) => patchSelectedWires({ wireStyle }),
      [patchSelectedWires],
    );

    const applyWireArrowToSelection = useCallback(
      (wireArrow: WireArrow) => patchSelectedWires({ wireArrow }),
      [patchSelectedWires],
    );

    const applyShapeKindToSelection = useCallback(
      (shapeKind: BoardShapeKind) => {
        if (lockedRef.current) return;
        const targetIds = new Set(
          nodesRef.current
            .filter(
              (n) =>
                selectedRef.current.has(n.id) &&
                n.loai === "sticky" &&
                normalizeShapeKind(n.layout.shapeKind),
            )
            .map((n) => n.id),
        );
        if (targetIds.size === 0) return;
        const before = nodesRef.current
          .filter((n) => targetIds.has(n.id))
          .map(snapshotOf);
        const next = nodesRef.current.map((n) =>
          targetIds.has(n.id)
            ? { ...n, layout: { ...n.layout, shapeKind } }
            : n,
        );
        commitNodes(next);
        const after = before.map((s) => ({
          ...s,
          layout: { ...s.layout, shapeKind },
        }));
        history.push({ type: "layout", before, after });
        void persistLayoutBatch(next.filter((n) => targetIds.has(n.id)));
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistLayoutBatch],
    );

    const discardEmptyTextNode = useCallback(
      (node: BoardNode) => {
        setEditingId(null);
        const pending = pendingPromoteRef.current.get(node.id);
        pendingPromoteRef.current.delete(node.id);
        if (pending) void persist.deleteNode(pending);
        if (isLocalBoardNodeId(node.id)) {
          cancelledLocalIdsRef.current.add(node.id);
        } else {
          void persist.deleteNode(node);
        }
        commitNodes(nodesRef.current.filter((n) => n.id !== node.id));
        if (selectedRef.current.has(node.id)) setSelection(new Set());
        emitSelection();
      },
      [commitNodes, emitSelection, persist, setSelection],
    );

    const cancelNodeEdit = useCallback(() => {
      const prev = editingRef.current;
      setEditingId(null);
      if (!prev) return;
      const node = nodesRef.current.find((n) => n.id === prev);
      if (
        node &&
        (isTextStickyNode(node) || isCommentNode(node)) &&
        !(node.noiDung ?? "").trim()
      ) {
        discardEmptyTextNode(node);
        return;
      }
      const pending = pendingPromoteRef.current.get(prev);
      if (pending) promoteLocalNode(prev, pending);
    }, [discardEmptyTextNode, promoteLocalNode]);

    const requestNodeEdit = useCallback(
      (id: string) => {
        setSelection(new Set([id]));
        setEditingId(id);
      },
      [setSelection],
    );

    const discardBlankTextStickies = useCallback(
      (exceptId?: string | null) => {
        const now = Date.now();
        const blanks = nodesRef.current.filter((n) => {
          if (n.id === exceptId) return false;
          // Đang soạn — tuyệt đối không xóa.
          if (editingRef.current === n.id) return false;
          if (!(isTextStickyNode(n) || isCommentNode(n))) return false;
          if ((n.noiDung ?? "").trim()) return false;
          // Comment mới tạo: cho user thời gian gõ (không xóa trong ~3s).
          if (isCommentNode(n)) {
            const born = Date.parse(n.taoLuc);
            if (Number.isFinite(born) && now - born < 3000) return false;
            if (justPlacedIdsRef.current.has(n.id)) return false;
          } else {
            const born = Date.parse(n.taoLuc);
            if (Number.isFinite(born) && now - born < 600) return false;
          }
          return true;
        });
        if (blanks.length === 0) return;
        const ids = new Set(blanks.map((n) => n.id));
        for (const node of blanks) {
          const pending = pendingPromoteRef.current.get(node.id);
          pendingPromoteRef.current.delete(node.id);
          if (pending) void persist.deleteNode(pending);
          if (isLocalBoardNodeId(node.id)) {
            cancelledLocalIdsRef.current.add(node.id);
          } else {
            void persist.deleteNode(node);
          }
        }
        commitNodes(nodesRef.current.filter((n) => !ids.has(n.id)));
        if ([...selectedRef.current].some((id) => ids.has(id))) {
          setSelection(
            new Set([...selectedRef.current].filter((id) => !ids.has(id))),
          );
        }
        emitSelection();
      },
      [commitNodes, emitSelection, persist, setSelection],
    );

    useEffect(() => {
      if (editingId) return;
      discardBlankTextStickies();
      // Comment vừa tạo rồi thoát edit quá sớm — dọn lại sau grace.
      const t = window.setTimeout(() => {
        if (!editingRef.current) discardBlankTextStickies();
      }, 3200);
      return () => window.clearTimeout(t);
    }, [editingId, discardBlankTextStickies]);

    const fitTextNodeSize = useCallback(
      (nodeId: string, size: { w: number; h: number }) => {
        const node = byId(nodeId);
        if (!node || lockedRef.current) return;
        if (!isTextStickyNode(node) || isAreaTextNode(node)) return;
        const w = Math.max(24, size.w);
        const h = Math.max(20, size.h);
        if (node.layout.w === w && node.layout.h === h) return;
        const updated = {
          ...node,
          layout: { ...node.layout, w, h, textKind: "fit" as const },
        };
        commitNodes(
          refitParentFrame(
            nodesRef.current.map((n) => (n.id === nodeId ? updated : n)),
            nodeId,
          ),
        );
      },
      [byId, commitNodes],
    );

    const commitNodeText = useCallback(
      (
        nodeId: string,
        text: string,
        opts?: { keepEditing?: boolean },
      ) => {
        if (!opts?.keepEditing) {
          editingRef.current = null;
          setEditingId(null);
        }
        const node = byId(nodeId);
        if (!node || lockedRef.current) return;
        if (
          (isTextStickyNode(node) || isCommentNode(node)) &&
          !text.trim() &&
          !opts?.keepEditing
        ) {
          // Comment mới: đừng xóa ngay lúc blur sớm — để user kịp gõ.
          if (isCommentNode(node)) {
            const born = Date.parse(node.taoLuc);
            const young =
              (Number.isFinite(born) && Date.now() - born < 3000) ||
              justPlacedIdsRef.current.has(node.id);
            if (young) {
              editingRef.current = nodeId;
              setEditingId(nodeId);
              return;
            }
          }
          discardEmptyTextNode(node);
          return;
        }
        if ((node.noiDung ?? "") === text) {
          const pending = pendingPromoteRef.current.get(nodeId);
          // Đừng promote khi unmount keepEditing — đổi id sẽ remount textarea
          // và nuốt chữ / mất focus lúc vừa tạo comment.
          if (pending && !opts?.keepEditing) promoteLocalNode(nodeId, pending);
          return;
        }
        const before = [snapshotOf(node)];
        const fitLayout =
          isTextStickyNode(node) && !isAreaTextNode(node)
            ? {
                ...measureFitTextSize(
                  text,
                  node.layout.textSize ?? DEFAULT_TEXT_SIZE,
                ),
                textKind: "fit" as const,
              }
            : null;
        const updated = {
          ...node,
          noiDung: text,
          ...(fitLayout
            ? { layout: { ...node.layout, ...fitLayout } }
            : {}),
        };
        const after = [snapshotOf(updated)];
        commitNodes(
          nodesRef.current.map((n) => (n.id === nodeId ? updated : n)),
        );
        history.push({ type: "layout", before, after });
        const pending = pendingPromoteRef.current.get(nodeId);
        if (pending) promoteLocalNode(nodeId, pending);
        else persistNodeLayout(updated, { noiDung: text });
        emitSelection();
      },
      [
        byId,
        commitNodes,
        emitSelection,
        history,
        discardEmptyTextNode,
        persistNodeLayout,
        promoteLocalNode,
      ],
    );

    const commitTable = useCallback(
      (
        nodeId: string,
        text: string,
        opts?: {
          keepEditing?: boolean;
          layout?: { w?: number; h?: number };
        },
      ) => {
        if (!opts?.keepEditing) setEditingId(null);
        else setEditingId(nodeId);
        const node = byId(nodeId);
        if (!node || lockedRef.current) return;
        const nextLayout = opts?.layout
          ? {
              ...node.layout,
              ...(opts.layout.w != null ? { w: opts.layout.w } : {}),
              ...(opts.layout.h != null ? { h: opts.layout.h } : {}),
            }
          : node.layout;
        const sameText = (node.noiDung ?? "") === text;
        const sameSize =
          nextLayout.w === node.layout.w && nextLayout.h === node.layout.h;
        if (sameText && sameSize) return;
        const before = [snapshotOf(node)];
        const updated = { ...node, noiDung: text, layout: nextLayout };
        commitNodes(
          nodesRef.current.map((n) => (n.id === nodeId ? updated : n)),
        );
        history.push({
          type: "layout",
          before,
          after: [snapshotOf(updated)],
        });
        persistNodeLayout(updated, { noiDung: text });
        emitSelection();
      },
      [byId, commitNodes, emitSelection, history, persistNodeLayout],
    );

    /** Fit khung node ảnh / video file theo tỉ lệ gốc (một lần, trừ khi đã imageFitted). */
    const fittingImageIdsRef = useRef(new Set<string>());
    const commentPersistTimersRef = useRef(new Map<string, number>());
    const fitImageNode = useCallback(
      (nodeId: string, naturalW: number, naturalH: number) => {
        const node = byId(nodeId);
        if (!node || (node.loai !== "anh" && node.loai !== "link")) return;
        if (!(naturalW > 0 && naturalH > 0)) return;

        // Đã fit đúng media gốc → giữ resize tay của user.
        if (
          node.layout.imageFitted &&
          node.layout.mediaW === naturalW &&
          node.layout.mediaH === naturalH
        ) {
          return;
        }
        // Legacy imageFitted không có mediaW — chỉ bỏ qua nếu tỉ lệ media đã khớp.
        if (node.layout.imageFitted && !node.layout.mediaW) {
          const cur = nodeRect(node);
          const infoH = node.loai === "link" ? BOARD_LINK_INFO_H : 0;
          const mediaH = Math.max(1, cur.h - infoH);
          const aspectCur = cur.w / mediaH;
          const aspectNat = naturalW / naturalH;
          if (Math.abs(aspectCur - aspectNat) < 0.05) {
            // Ghi nhận mediaW/H để lần sau không re-fit.
            const marked = {
              ...node,
              layout: {
                ...node.layout,
                mediaW: naturalW,
                mediaH: naturalH,
              },
            };
            commitNodes(
              nodesRef.current.map((n) => (n.id === nodeId ? marked : n)),
            );
            if (!lockedRef.current) persistNodeLayout(marked);
            return;
          }
        }

        if (fittingImageIdsRef.current.has(nodeId)) return;
        fittingImageIdsRef.current.add(nodeId);

        const size =
          node.loai === "link"
            ? fitBoardLinkVideoSize(naturalW, naturalH)
            : fitBoardImageSize(naturalW, naturalH);
        const cur = nodeRect(node);
        const aspectCur = cur.w / Math.max(1, cur.h);
        const aspectNat = size.w / Math.max(1, size.h);
        const aspectClose = Math.abs(aspectCur - aspectNat) < 0.03;
        const sizeClose =
          Math.abs(cur.w - size.w) <= 2 && Math.abs(cur.h - size.h) <= 2;

        const mediaLayout = {
          mediaW: naturalW,
          mediaH: naturalH,
          imageFitted: true as const,
        };

        if (aspectClose && sizeClose) {
          const marked = {
            ...node,
            layout: { ...node.layout, ...mediaLayout },
          };
          commitNodes(
            nodesRef.current.map((n) => (n.id === nodeId ? marked : n)),
          );
          if (!lockedRef.current) persistNodeLayout(marked);
          return;
        }

        const cx = cur.x + cur.w / 2;
        const cy = cur.y + cur.h / 2;
        const updated = {
          ...node,
          layout: {
            ...node.layout,
            x: cx - size.w / 2,
            y: cy - size.h / 2,
            w: size.w,
            h: size.h,
            ...mediaLayout,
          },
        };
        commitNodes(
          nodesRef.current.map((n) => (n.id === nodeId ? updated : n)),
        );
        if (selectedRef.current.has(nodeId)) emitSelection();
        if (!lockedRef.current) persistNodeLayout(updated);
      },
      [byId, commitNodes, emitSelection, persistNodeLayout],
    );

    const fitCommentNode = useCallback(
      (nodeId: string, size: { w: number; h: number }) => {
        const node = byId(nodeId);
        if (!node) return;
        if (normalizeContentKind(node.layout.contentKind) !== "comment") return;
        const cur = nodeRect(node);
        const w = Math.max(BOARD_COMMENT_MIN_W, Math.round(size.w));
        const h = Math.max(BOARD_COMMENT_MIN_H, Math.round(size.h));
        if (Math.abs(cur.w - w) < 2 && Math.abs(cur.h - h) < 2) return;
        const updated = {
          ...node,
          layout: {
            ...node.layout,
            w,
            h,
          },
        };
        commitNodes(
          nodesRef.current.map((n) => (n.id === nodeId ? updated : n)),
        );
        if (selectedRef.current.has(nodeId)) emitSelection();
        if (lockedRef.current) return;
        const timers = commentPersistTimersRef.current;
        const prev = timers.get(nodeId);
        if (prev) window.clearTimeout(prev);
        timers.set(
          nodeId,
          window.setTimeout(() => {
            timers.delete(nodeId);
            const latest = nodesRef.current.find((n) => n.id === nodeId);
            if (latest) persistNodeLayout(latest);
          }, 280),
        );
      },
      [byId, commitNodes, emitSelection, persistNodeLayout],
    );

    const renameSelectedFrame = useCallback(
      (name: string) => {
        const frame = nodesRef.current.find(
          (n) => selectedRef.current.has(n.id) && n.loai === "frame",
        );
        if (!frame || lockedRef.current) return;
        const updated = { ...frame, noiDung: name };
        commitNodes(
          nodesRef.current.map((n) => (n.id === frame.id ? updated : n)),
        );
        persistNodeLayout(updated, { noiDung: name });
        emitSelection();
      },
      [commitNodes, emitSelection, persistNodeLayout],
    );

    const groupSelection = useCallback(
      (mau: string) => {
        if (lockedRef.current) return;
        const cards = nodesRef.current.filter(
          (n) =>
            selectedRef.current.has(n.id) &&
            n.loai !== "frame" &&
            n.loai !== "connector",
        );
        if (cards.length < 2) return;
        const cardIds = new Set(cards.map((n) => n.id));

        const rects = cards.map(nodeRect);
        const minX = Math.min(...rects.map((r) => r.x));
        const minY = Math.min(...rects.map((r) => r.y));
        const maxX = Math.max(...rects.map((r) => r.x + r.w));
        const maxY = Math.max(...rects.map((r) => r.y + r.h));
        const layout = {
          x: minX - GROUP_PAD,
          y: minY - GROUP_PAD - GROUP_TITLE_H,
          w: maxX - minX + GROUP_PAD * 2,
          h: maxY - minY + GROUP_PAD * 2 + GROUP_TITLE_H,
          mau,
        };
        const noiDung = `Nhóm ${cards.length}`;
        const tempId = `local-frame-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const canvasId =
          nodesRef.current.find((n) => n.canvasId)?.canvasId ?? "";
        const now = new Date().toISOString();
        const frame: BoardNode = {
          id: tempId,
          canvasId,
          loai: "frame",
          messageId: null,
          url: null,
          noiDung,
          layout,
          idNguoiTao: "",
          taoLuc: now,
          capNhatLuc: now,
        };

        const before = cards.map(snapshotOf);
        const after = before.map((s) => ({
          ...s,
          layout: { ...s.layout, groupId: tempId },
        }));

        commitNodes([
          frame,
          ...nodesRef.current.map((n) =>
            cardIds.has(n.id)
              ? { ...n, layout: { ...n.layout, groupId: tempId } }
              : n,
          ),
        ]);
        history.push({ type: "group", frame, before, after });
        setSelection(new Set([tempId]));
        emitSelection();

        void (async () => {
          const created = await persist.createNode({
            loai: "frame",
            layout,
            noiDung,
          });
          const stillHere = nodesRef.current.some((n) => n.id === tempId);
          if (!created) {
            if (!stillHere) return;
            commitNodes(
              nodesRef.current
                .filter((n) => n.id !== tempId)
                .map((n) =>
                  n.layout.groupId === tempId
                    ? { ...n, layout: { ...n.layout, groupId: null } }
                    : n,
                ),
            );
            setSelection(new Set(cardIds));
            emitSelection();
            return;
          }
          if (!stillHere) {
            void persist.deleteNode(created);
            return;
          }
          history.remapNodeId(tempId, created.id);
          const serverFrame: BoardNode = {
            ...created,
            layout: { ...created.layout, ...layout },
            noiDung: created.noiDung ?? noiDung,
          };
          const next = nodesRef.current.map((n) => {
            if (n.id === tempId) return serverFrame;
            if (n.layout.groupId === tempId) {
              return { ...n, layout: { ...n.layout, groupId: created.id } };
            }
            return n;
          });
          commitNodes(next);
          if (selectedRef.current.has(tempId)) {
            setSelection(new Set([created.id]));
          }
          void persistLayoutBatch(next.filter((n) => cardIds.has(n.id)));
          emitSelection();
        })();
      },
      [
        commitNodes,
        emitSelection,
        history,
        persist,
        persistLayoutBatch,
        setSelection,
      ],
    );

    const ungroupSelection = useCallback(async () => {
      if (lockedRef.current) return;
      const frame = nodesRef.current.find(
        (n) => selectedRef.current.has(n.id) && n.loai === "frame",
      );
      if (!frame) return;
      const members = membersOfFrame(frame.id);

      const before = members.map(snapshotOf);
      const after = before.map((s) => ({
        ...s,
        layout: { ...s.layout, groupId: null },
      }));

      const next = nodesRef.current
        .filter((n) => n.id !== frame.id)
        .map((n) =>
          n.layout.groupId === frame.id
            ? { ...n, layout: { ...n.layout, groupId: null } }
            : n,
        );
      commitNodes(next);
      history.push({ type: "ungroup", frame, before, after });
      void persist.deleteNode(frame);
      void persistLayoutBatch(
        after
          .map((snap) => next.find((x) => x.id === snap.nodeId))
          .filter((n): n is BoardNode => Boolean(n)),
      );
      setSelection(new Set());
      emitSelection();
    }, [
      commitNodes,
      emitSelection,
      history,
      membersOfFrame,
      persist,
      persistLayoutBatch,
      setSelection,
    ]);

    const deleteSelection = useCallback(() => {
      if (lockedRef.current) return;
      const sel = [...selectedRef.current]
        .map((id) => nodesRef.current.find((n) => n.id === id))
        .filter((n): n is BoardNode => Boolean(n));
      if (sel.length === 0) return;

      const deletedFrameIds = new Set(
        sel.filter((n) => n.loai === "frame").map((n) => n.id),
      );
      const deletedIds = new Set(sel.map((n) => n.id));

      // Dây nối dính vào node bị xóa — xóa theo. Push TRƯỚC các node để
      // undo tạo lại node trước rồi mới tới dây (from/to được remap đúng).
      const attachedWires = nodesRef.current.filter(
        (n) =>
          n.loai === "connector" &&
          !deletedIds.has(n.id) &&
          ((n.layout.from && deletedIds.has(n.layout.from)) ||
            (n.layout.to && deletedIds.has(n.layout.to))),
      );
      for (const wire of attachedWires) {
        history.push({ type: "delete", node: wire });
        void persist.deleteNode(wire);
        deletedIds.add(wire.id);
      }

      for (const node of sel) {
        if (node.loai === "frame") {
          const members = membersOfFrame(node.id);
          const before = members.map(snapshotOf);
          const after = before.map((s) => ({
            ...s,
            layout: { ...s.layout, groupId: null },
          }));
          history.push({ type: "ungroup", frame: node, before, after });
          void persist.deleteNode(node);
          for (const m of members) {
            if (deletedIds.has(m.id)) continue;
            void persist.patchNode(m.id, {
              layout: { ...m.layout, groupId: null },
            });
          }
        } else {
          // Node tạm (paste/upload dở) — chỉ gỡ UI, không gọi API / không undo.
          if (isLocalBoardNodeId(node.id)) {
            cancelledLocalIdsRef.current.add(node.id);
            if (node.url?.startsWith("blob:")) {
              URL.revokeObjectURL(node.url);
            }
            setUploadingIds((prev) => {
              if (!prev.has(node.id)) return prev;
              const next = new Set(prev);
              next.delete(node.id);
              return next;
            });
          } else {
            history.push({ type: "delete", node });
            void persist.deleteNode(node);
          }
        }
      }

      const next = nodesRef.current
        .filter((n) => !deletedIds.has(n.id))
        .map((n) =>
          n.layout.groupId && deletedFrameIds.has(n.layout.groupId)
            ? { ...n, layout: { ...n.layout, groupId: null } }
            : n,
        );
      commitNodes(next);
      setSelection(new Set());
      setEditingId(null);
      emitSelection();
    }, [
      commitNodes,
      emitSelection,
      history,
      membersOfFrame,
      persist,
      setSelection,
    ]);

    /** Xóa hết block — caller đã confirm. Không đưa vào undo. */
    const clearBoard = useCallback(() => {
      if (lockedRef.current) return;
      const all = [...nodesRef.current];
      if (all.length === 0) return;

      for (const node of all) {
        if (isLocalBoardNodeId(node.id)) {
          cancelledLocalIdsRef.current.add(node.id);
          if (node.url?.startsWith("blob:")) {
            URL.revokeObjectURL(node.url);
          }
        } else {
          void persist.deleteNode(node);
        }
      }

      commitNodes([]);
      setSelection(new Set());
      setEditingId(null);
      setUploadingIds(new Set());
      setDrawDraft(null);
      setWireDraft(null);
      setMarqueeRect(null);
      history.clear();
      emitSelection();
    }, [commitNodes, emitSelection, history, persist, setSelection]);

    /* ---------- hydrate ---------- */

    useEffect(() => {
      if (!nodesProp || hydratedRef.current) return;
      hydratedRef.current = true;

      // Connector giữ lại khi đủ 2 đầu from/to; comment trống → xóa (không hiện).
      const usable = nodesProp.filter(
        (n) =>
          (n.loai !== "connector" || Boolean(n.layout.from && n.layout.to)) &&
          !(isCommentNode(n) && !(n.noiDung ?? "").trim()),
      );
      const emptyComments = nodesProp.filter(
        (n) => isCommentNode(n) && !(n.noiDung ?? "").trim(),
      );
      for (const empty of emptyComments) {
        if (!isLocalBoardNodeId(empty.id)) void persist.deleteNode(empty);
      }
      const frameById = new Map(
        usable.filter((n) => n.loai === "frame").map((n) => [n.id, n]),
      );
      // Node thuộc group lưu tọa độ tương đối — quy về tuyệt đối.
      const absolute = usable.map((n) => {
        const gid = n.layout.groupId;
        if (!gid || n.loai === "frame") return n;
        const frame = frameById.get(gid);
        if (!frame) return { ...n, layout: { ...n.layout, groupId: null } };
        return {
          ...n,
          layout: {
            ...n.layout,
            x: frame.layout.x + n.layout.x,
            y: frame.layout.y + n.layout.y,
          },
        };
      });
      zCounterRef.current =
        Math.max(0, ...absolute.map((n) => n.layout.z ?? 0)) + 1;
      commitNodes(absolute);

      requestAnimationFrame(() => {
        const focusId = pendingFocusNodeId;
        if (focusId) {
          const target = absolute.find((n) => n.id === focusId);
          if (target) {
            setSelection(new Set([target.id]));
            zoomToNode(target);
            return;
          }
        }
        const highlight = (pendingHighlightNodeIds ?? []).filter(Boolean);
        if (highlight.length > 0) {
          const set = new Set(highlight);
          setHighlightIds(set);
          setSelection(set);
          const first = absolute.find((n) => set.has(n.id));
          if (first) zoomToNode(first);
          window.setTimeout(() => {
            setHighlightIds((prev) => (prev.size === 0 ? prev : new Set()));
          }, 4200);
          return;
        }
        if (absolute.length > 0) zoomToFit();
      });
    }, [
      commitNodes,
      nodesProp,
      pendingFocusNodeId,
      pendingHighlightNodeIds,
      persist,
      setSelection,
      zoomToFit,
      zoomToNode,
    ]);

    /* ---------- cảm ứng: 2 ngón pinch zoom + pan ---------- */

    const abortActiveGesture = useCallback(() => {
      const g = gestureRef.current;
      gestureRef.current = null;
      wirePathClickRef.current = null;
      if (movePreviewRafRef.current) {
        cancelAnimationFrame(movePreviewRafRef.current);
        movePreviewRafRef.current = 0;
      }
      clearGroupSnapUi(true);
      if (!g) {
        setInteracting(false);
        setMarqueeRect(null);
        setWireDraft(null);
        setWireSnap(null);
        setDrawDraft(null);
        return;
      }

      const root = rootRef.current;
      const release = (id: number) => {
        try {
          if (root?.hasPointerCapture?.(id)) root.releasePointerCapture(id);
        } catch {
          /* Safari: capture đã hết. */
        }
        for (const nodeEl of nodeElByIdRef.current.values()) {
          try {
            if (nodeEl.hasPointerCapture?.(id)) nodeEl.releasePointerCapture(id);
          } catch {
            /* ignore */
          }
        }
      };
      release(g.pointerId);

      if (g.type === "move") {
        for (const id of g.nodeIds) {
          const start = g.startPos.get(id);
          const el = nodeElByIdRef.current.get(id);
          if (start && el) {
            el.style.transform = `translate(${start.x}px, ${start.y}px)`;
          }
          el?.classList.remove("is-dragging");
        }
      }
      if (g.type === "resize") {
        const bySnap = new Map(g.before.map((s) => [s.nodeId, s]));
        commitNodes(
          nodesRef.current.map((n) => {
            const snap = bySnap.get(n.id);
            if (!snap) return n;
            return { ...n, layout: { ...snap.layout }, noiDung: snap.noiDung };
          }),
        );
      }
      if (g.type === "wire-handle") {
        const snap = g.before[0];
        if (snap) {
          commitNodes(
            nodesRef.current.map((n) =>
              n.id === snap.nodeId
                ? { ...n, layout: { ...snap.layout }, noiDung: snap.noiDung }
                : n,
            ),
          );
        }
      }
      if (g.type === "marquee") {
        setSelection(new Set(g.baseSelection));
      }

      setInteracting(false);
      setMarqueeRect(null);
      setWireDraft(null);
      setWireSnap(null);
      setDrawDraft(null);
    }, [clearGroupSnapUi, commitNodes, setSelection]);

    // TouchEvent (không PointerEvent): iOS không luôn gửi pointerdown ngón 2
    // khi ngón 1 đã capture. preventDefault chặn zoom trang.
    useEffect(() => {
      const el = rootRef.current;
      if (!el) return;

      const applyPinch = (a: { x: number; y: number }, b: { x: number; y: number }) => {
        const pinch = pinchRef.current;
        if (!pinch) return;
        const rect = el.getBoundingClientRect();
        const cam = pinch.camStart;
        const nextZ = Math.min(
          BOARD_MAX_ZOOM,
          Math.max(
            BOARD_MIN_ZOOM,
            cam.z * (clientDist(a, b) / pinch.startDist),
          ),
        );
        const m = clientMid(a, b);
        const sx = m.x - rect.left;
        const sy = m.y - rect.top;
        const px = (pinch.startMid.x - rect.left) / cam.z - cam.x;
        const py = (pinch.startMid.y - rect.top) / cam.z - cam.y;
        commitCamera({ x: sx / nextZ - px, y: sy / nextZ - py, z: nextZ });
      };

      const onStart = (e: TouchEvent) => {
        if (e.touches.length < 2) return;
        e.preventDefault();
        if (pinchRef.current) return;
        const a = e.touches.item(0);
        const b = e.touches.item(1);
        if (!a || !b) return;
        abortActiveGesture();
        const pa = { x: a.clientX, y: a.clientY };
        const pb = { x: b.clientX, y: b.clientY };
        pinchRef.current = {
          ids: [a.identifier, b.identifier],
          startDist: Math.max(clientDist(pa, pb), 1),
          startMid: clientMid(pa, pb),
          camStart: { ...cameraRef.current },
        };
        setPanning(true);
      };

      const onMove = (e: TouchEvent) => {
        const pinch = pinchRef.current;
        if (!pinch) return;
        const ta = touchById(e.touches, pinch.ids[0]);
        const tb = touchById(e.touches, pinch.ids[1]);
        if (!ta || !tb) return;
        e.preventDefault();
        applyPinch(
          { x: ta.clientX, y: ta.clientY },
          { x: tb.clientX, y: tb.clientY },
        );
      };

      const onEnd = (e: TouchEvent) => {
        const pinch = pinchRef.current;
        if (!pinch) return;
        const ta = touchById(e.touches, pinch.ids[0]);
        const tb = touchById(e.touches, pinch.ids[1]);
        if (ta && tb) return;
        pinchRef.current = null;
        setPanning(false);
        e.preventDefault();
      };

      const preventPageZoom = (ev: Event) => ev.preventDefault();

      el.addEventListener("touchstart", onStart, { passive: false, capture: true });
      el.addEventListener("touchmove", onMove, { passive: false, capture: true });
      el.addEventListener("touchend", onEnd, { passive: false, capture: true });
      el.addEventListener("touchcancel", onEnd, { passive: false, capture: true });
      el.addEventListener("gesturestart", preventPageZoom, { capture: true });
      el.addEventListener("gesturechange", preventPageZoom, { capture: true });
      return () => {
        el.removeEventListener("touchstart", onStart, { capture: true });
        el.removeEventListener("touchmove", onMove, { capture: true });
        el.removeEventListener("touchend", onEnd, { capture: true });
        el.removeEventListener("touchcancel", onEnd, { capture: true });
        el.removeEventListener("gesturestart", preventPageZoom, { capture: true });
        el.removeEventListener("gesturechange", preventPageZoom, { capture: true });
      };
    }, [abortActiveGesture, commitCamera]);

    /* ---------- pointer gestures ---------- */

    const startMove = useCallback(
      (e: ReactPointerEvent, nodeId: string) => {
        if (pinchRef.current) return;
        rootRef.current?.focus({ preventScroll: true });
        // Chọn/kéo node khác → thoát edit sticky/bảng (blur đã commit; clear để Delete hoạt động).
        if (editingRef.current && editingRef.current !== nodeId) {
          setEditingId(null);
        }
        const node = byId(nodeId);
        if (!node) return;

        if (e.shiftKey) {
          const ids = new Set(selectedRef.current);
          if (ids.has(nodeId)) ids.delete(nodeId);
          else ids.add(nodeId);
          setSelection(ids);
          return; // shift = chỉ toggle chọn, không kéo
        }

        let ids: Set<string>;
        if (selectedRef.current.has(nodeId)) {
          ids = new Set(selectedRef.current);
        } else {
          ids = new Set([nodeId]);
          setSelection(ids);
        }

        if (lockedRef.current) return;

        // Node kéo + thành viên của frame được kéo. Dây không có vị trí riêng.
        const moveIds = new Set<string>();
        for (const id of ids) {
          const n = byId(id);
          if (!n || n.loai === "connector") continue;
          moveIds.add(id);
          if (n.loai === "frame") {
            for (const m of membersOfFrame(n.id)) moveIds.add(m.id);
          }
        }

        const startPos = new Map<string, { x: number; y: number }>();
        const before: BoardLayoutSnapshot[] = [];
        for (const id of moveIds) {
          const n = byId(id);
          if (!n) continue;
          startPos.set(id, { x: n.layout.x, y: n.layout.y });
          before.push(snapshotOf(n));
        }

        // Bring-to-front các card kéo (không đụng frame).
        const zBase = zCounterRef.current;
        let zOffset = 0;
        commitNodes(
          nodesRef.current.map((n) =>
            moveIds.has(n.id) && n.loai !== "frame"
              ? { ...n, layout: { ...n.layout, z: zBase + ++zOffset } }
              : n,
          ),
        );
        zCounterRef.current = zBase + zOffset + 1;

        gestureRef.current = {
          type: "move",
          pointerId: e.pointerId,
          startClient: { x: e.clientX, y: e.clientY },
          nodeIds: [...moveIds],
          startPos,
          before,
          moved: false,
          lastDx: 0,
          lastDy: 0,
        };
        for (const id of moveIds) {
          nodeElByIdRef.current.get(id)?.classList.add("is-dragging");
        }
        const hostOnPick = [...moveIds]
          .map((id) => byId(id))
          .find((n) => n && n.loai === "frame")
          ?? [...moveIds]
            .map((id) => byId(id))
            .find((n) => n && n.layout.groupId);
        if (hostOnPick) {
          setGroupSnapHighlight(
            hostOnPick.loai === "frame"
              ? hostOnPick.id
              : (hostOnPick.layout.groupId ?? null),
          );
        }
        setInteracting(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      },
      [byId, commitNodes, membersOfFrame, setGroupSnapHighlight, setSelection],
    );

    const startResize = useCallback(
      (e: ReactPointerEvent, nodeId: string, corner: Corner) => {
        if (pinchRef.current) return;
        const node = byId(nodeId);
        if (!node || lockedRef.current) return;
        e.stopPropagation();
        e.preventDefault();
        rootRef.current?.focus({ preventScroll: true });
        // Thoát ô bảng/sticky — Delete sau khi kéo handle phải xóa node.
        if (editingRef.current) setEditingId(null);
        const parent =
          node.loai !== "frame" && node.layout.groupId
            ? nodesRef.current.find(
                (n) => n.id === node.layout.groupId && n.loai === "frame",
              )
            : null;
        gestureRef.current = {
          type: "resize",
          pointerId: e.pointerId,
          startClient: { x: e.clientX, y: e.clientY },
          nodeId,
          corner,
          startRect: nodeRect(node),
          before: parent
            ? [snapshotOf(node), snapshotOf(parent)]
            : [snapshotOf(node)],
          moved: false,
        };
        setInteracting(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      },
      [byId],
    );

    /* Ctrl/⌘+click lúc đang tool đặt: 1 lần là về chọn — không đợi click thứ hai
     * (lần đầu từng bị node/edit nuốt, hoặc chỉ blur ô soạn). */
    useEffect(() => {
      const el = rootRef.current;
      if (!el) return;
      const onCapture = (e: PointerEvent) => {
        if (e.button !== 0 || lockedRef.current) return;
        if (!isBoardPlaceTool(toolRef.current)) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        if (isTextEditingTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        setTool("select");
        setEditingId(null);
      };
      el.addEventListener("pointerdown", onCapture, true);
      return () => el.removeEventListener("pointerdown", onCapture, true);
    }, [setTool]);

    const onRootPointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (pinchRef.current) return;
        rootRef.current?.focus({ preventScroll: true });
        if (
          e.button === 1 ||
          (e.button === 0 &&
            (spaceHeldRef.current || toolRef.current === "pan"))
        ) {
          e.preventDefault();
          gestureRef.current = {
            type: "pan",
            pointerId: e.pointerId,
            startClient: { x: e.clientX, y: e.clientY },
            camStart: { ...cameraRef.current },
          };
          setPanning(true);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          return;
        }
        if (e.button !== 0) return;

        if (toolRef.current === "draw" && !lockedRef.current) {
          e.preventDefault();
          const start = pageFromClient(e.clientX, e.clientY);
          const color = inkColorRef.current || "#1a1a1a";
          const width = 2.5;
          gestureRef.current = {
            type: "draw",
            pointerId: e.pointerId,
            color,
            width,
            points: [start],
          };
          setDrawDraft({ color, width, points: [start] });
          setSelection(new Set());
          setInteracting(true);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          return;
        }

        if (isBoardPlaceTool(toolRef.current) && !lockedRef.current) {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            setTool("select");
            setEditingId(null);
            return;
          }
          if (toolRef.current === "text") {
            const start = pageFromClient(e.clientX, e.clientY);
            gestureRef.current = {
              type: "place-text",
              pointerId: e.pointerId,
              startPage: start,
              startClient: { x: e.clientX, y: e.clientY },
            };
            setInteracting(true);
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            return;
          }
          placeArmedAtPage(pageFromClient(e.clientX, e.clientY));
          return;
        }

        // Nền trống → marquee. Click ra ngoài: ẩn toolbar bảng / thoát edit.
        const start = pageFromClient(e.clientX, e.clientY);
        gestureRef.current = {
          type: "marquee",
          pointerId: e.pointerId,
          startPage: start,
          additive: e.shiftKey,
          baseSelection: e.shiftKey ? new Set(selectedRef.current) : new Set(),
        };
        if (!e.shiftKey) {
          setSelection(new Set());
          setEditingId(null);
        }
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      },
      [pageFromClient, placeArmedAtPage, setSelection, setTool],
    );

    const onRootPointerMove = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (pinchRef.current) return;
        const g = gestureRef.current;
        if (!g || g.pointerId !== e.pointerId) return;

        if (g.type === "pan") {
          const cam = g.camStart;
          commitCamera({
            x: cam.x + (e.clientX - g.startClient.x) / cam.z,
            y: cam.y + (e.clientY - g.startClient.y) / cam.z,
            z: cam.z,
          });
          return;
        }

        if (g.type === "move") {
          const cam = cameraRef.current;
          if (
            !g.moved &&
            Math.hypot(
              e.clientX - g.startClient.x,
              e.clientY - g.startClient.y,
            ) < DRAG_THRESHOLD_PX
          ) {
            return;
          }
          g.moved = true;
          g.lastDx = (e.clientX - g.startClient.x) / cam.z;
          g.lastDy = (e.clientY - g.startClient.y) / cam.z;
          // Coalesce về 1 frame — không setState (tránh re-render card/iframe).
          if (movePreviewRafRef.current) return;
          movePreviewRafRef.current = requestAnimationFrame(() => {
            movePreviewRafRef.current = 0;
            const cur = gestureRef.current;
            if (!cur || cur.type !== "move" || !cur.moved) return;
            applyMovePreview(cur.nodeIds, cur.startPos, cur.lastDx, cur.lastDy);
            previewGroupSnapHost(cur);
          });
          return;
        }

        if (g.type === "wire") {
          const p = pageFromClient(e.clientX, e.clientY);
          const snapDist = WIRE_PORT_SNAP_DIST / cameraRef.current.z;
          const snap = resolveWirePortSnap(
            nodesRef.current,
            p,
            g.fromId,
            snapDist,
          );
          setWireDraft({
            fromId: g.fromId,
            fromSide: g.fromSide,
            x: snap?.point.x ?? p.x,
            y: snap?.point.y ?? p.y,
            targetId: snap?.nodeId ?? null,
            toSide: snap?.side,
          });
          return;
        }

        if (g.type === "wire-handle") {
          const p = pageFromClient(e.clientX, e.clientY);
          g.moved = true;
          wirePathClickRef.current = null;
          const wire = byId(g.wireId);
          if (!wire || wire.loai !== "connector") return;

          if (g.handle === "anchor") {
            const idx = g.anchorIndex;
            if (idx == null) return;
            const list = [...(wire.layout.wireAnchors ?? [])];
            if (idx < 0 || idx >= list.length) return;
            list[idx] = { x: p.x, y: p.y };
            commitNodes(
              nodesRef.current.map((n) =>
                n.id === g.wireId
                  ? {
                      ...n,
                      layout: {
                        ...n.layout,
                        wireAnchors: list,
                        wireMid: null,
                      },
                    }
                  : n,
              ),
            );
            return;
          }

          if (g.handle === "mid") {
            let mid = { x: p.x, y: p.y };
            const style = normalizeWireStyle(wire.layout.wireStyle);
            if (style === "elbow") {
              const a = wire.layout.from ? byId(wire.layout.from) : null;
              const b = wire.layout.to ? byId(wire.layout.to) : null;
              if (a && b) {
                const route = wirePathBetween(
                  nodeRect(a),
                  nodeRect(b),
                  style,
                  wireRouteOptsFromLayout(wire.layout),
                );
                const horiz =
                  route.fromSide === "e" || route.fromSide === "w";
                mid = horiz
                  ? { x: p.x, y: route.mid.y }
                  : { x: route.mid.x, y: p.y };
              }
            }
            commitNodes(
              nodesRef.current.map((n) =>
                n.id === g.wireId
                  ? {
                      ...n,
                      layout: {
                        ...n.layout,
                        wireMid: mid,
                      },
                    }
                  : n,
              ),
            );
            return;
          }

          const endId =
            g.handle === "from" ? wire.layout.from : wire.layout.to;
          const otherId =
            g.handle === "from" ? wire.layout.to : wire.layout.from;
          const snapDist = WIRE_PORT_SNAP_DIST / cameraRef.current.z;
          const snap = findWirePortSnap(
            wirePortCandidates(nodesRef.current),
            p,
            {
              excludeIds: otherId ? [otherId] : [],
              maxDist: snapDist,
            },
          );
          const hitSnap =
            snap ??
            (() => {
              const hit = hitNodeAt(nodesRef.current, p, otherId ?? undefined);
              if (!hit || hit.id === otherId) return null;
              const port = nearestWirePort(nodeRect(hit), p);
              return {
                nodeId: hit.id,
                side: port.side,
                offset: port.offset,
                point: port.point,
              };
            })();
          if (hitSnap && hitSnap.nodeId !== otherId) {
            commitNodes(
              nodesRef.current.map((n) => {
                if (n.id !== g.wireId) return n;
                if (g.handle === "from") {
                  return {
                    ...n,
                    layout: {
                      ...n.layout,
                      from: hitSnap.nodeId,
                      wireFromSide: hitSnap.side,
                      wireFromOffset: hitSnap.offset,
                    },
                  };
                }
                return {
                  ...n,
                  layout: {
                    ...n.layout,
                    to: hitSnap.nodeId,
                    wireToSide: hitSnap.side,
                    wireToOffset: hitSnap.offset,
                  },
                };
              }),
            );
            return;
          }
          const endNode = endId ? byId(endId) : null;
          if (!endNode) return;
          const port = nearestWirePort(nodeRect(endNode), p);
          commitNodes(
            nodesRef.current.map((n) => {
              if (n.id !== g.wireId) return n;
              if (g.handle === "from") {
                return {
                  ...n,
                  layout: {
                    ...n.layout,
                    wireFromSide: port.side,
                    wireFromOffset: port.offset,
                  },
                };
              }
              return {
                ...n,
                layout: {
                  ...n.layout,
                  wireToSide: port.side,
                  wireToOffset: port.offset,
                },
              };
            }),
          );
          return;
        }

        if (g.type === "resize") {
          const cam = cameraRef.current;
          const dx = (e.clientX - g.startClient.x) / cam.z;
          const dy = (e.clientY - g.startClient.y) / cam.z;
          g.moved = true;
          const r = { ...g.startRect };
          if (g.corner.includes("e")) r.w += dx;
          if (g.corner.includes("s")) r.h += dy;
          if (g.corner.includes("w")) {
            r.w -= dx;
            r.x += dx;
          }
          if (g.corner.includes("n")) {
            r.h -= dy;
            r.y += dy;
          }
          if (r.w < BOARD_MIN_NODE_SIZE) {
            if (g.corner.includes("w")) r.x -= BOARD_MIN_NODE_SIZE - r.w;
            r.w = BOARD_MIN_NODE_SIZE;
          }
          if (r.h < BOARD_MIN_NODE_SIZE) {
            if (g.corner.includes("n")) r.y -= BOARD_MIN_NODE_SIZE - r.h;
            r.h = BOARD_MIN_NODE_SIZE;
          }
          const resized = nodesRef.current.map((n) =>
            n.id === g.nodeId
              ? {
                  ...n,
                  layout: {
                    ...n.layout,
                    x: r.x,
                    y: r.y,
                    w: r.w,
                    h: r.h,
                    ...(isTextStickyNode(n) && n.layout.textKind !== "area"
                      ? { textKind: "area" as const }
                      : {}),
                  },
                }
              : n,
          );
          commitNodes(refitParentFrame(resized, g.nodeId));
          return;
        }

        if (g.type === "draw") {
          const p = pageFromClient(e.clientX, e.clientY);
          const last = g.points[g.points.length - 1]!;
          if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
          g.points.push(p);
          setDrawDraft({
            color: g.color,
            width: g.width,
            points: [...g.points],
          });
          return;
        }

        if (g.type === "place-text") {
          const current = pageFromClient(e.clientX, e.clientY);
          const x = Math.min(g.startPage.x, current.x);
          const y = Math.min(g.startPage.y, current.y);
          const w = Math.abs(current.x - g.startPage.x);
          const h = Math.abs(current.y - g.startPage.y);
          setMarqueeRect({ x, y, w, h, kind: "place" });
          return;
        }

        // marquee
        const current = pageFromClient(e.clientX, e.clientY);
        const x = Math.min(g.startPage.x, current.x);
        const y = Math.min(g.startPage.y, current.y);
        const w = Math.abs(current.x - g.startPage.x);
        const h = Math.abs(current.y - g.startPage.y);
        setMarqueeRect({ x, y, w, h });

        const box = { x, y, w, h };
        const ids = new Set(g.baseSelection);
        for (const n of nodesRef.current) {
          if (n.loai === "connector") continue; // dây chỉ chọn bằng click
          const r = nodeRect(n);
          if (n.loai === "frame") {
            // Frame chỉ chọn khi marquee bao trọn.
            if (
              box.x <= r.x &&
              box.y <= r.y &&
              box.x + box.w >= r.x + r.w &&
              box.y + box.h >= r.y + r.h
            ) {
              ids.add(n.id);
            }
            continue;
          }
          if (rectsIntersect(box, r)) ids.add(n.id);
        }
        setSelection(ids);
      },
      [
        applyMovePreview,
        byId,
        commitCamera,
        commitNodes,
        pageFromClient,
        previewGroupSnapHost,
        setSelection,
      ],
    );

    const finishGesture = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (pinchRef.current) return;
        const g = gestureRef.current;
        if (!g || g.pointerId !== e.pointerId) return;
        gestureRef.current = null;
        if (movePreviewRafRef.current) {
          cancelAnimationFrame(movePreviewRafRef.current);
          movePreviewRafRef.current = 0;
        }
        if (g.type !== "move" || !g.moved) {
          clearGroupSnapUi(true);
        }
        if (g.type === "move") {
          for (const id of g.nodeIds) {
            nodeElByIdRef.current.get(id)?.classList.remove("is-dragging");
          }
        }
        setPanning(false);
        setInteracting(false);
        setMarqueeRect(null);
        setWireDraft(null);
        setWireSnap(null);
        setDrawDraft(null);
        wirePathClickRef.current = null;
        if (g.type === "pan") {
          if (cameraFlushRafRef.current) {
            cancelAnimationFrame(cameraFlushRafRef.current);
            cameraFlushRafRef.current = 0;
          }
          setCamera(cameraRef.current);
        }

        if (g.type === "place-text") {
          const end = pageFromClient(e.clientX, e.clientY);
          const dragged =
            Math.hypot(
              e.clientX - g.startClient.x,
              e.clientY - g.startClient.y,
            ) >= 8;
          if (!dragged) {
            addSticky(TEXT_STICKY_MAU, g.startPage);
            return;
          }
          addAreaText({
            x: Math.min(g.startPage.x, end.x),
            y: Math.min(g.startPage.y, end.y),
            w: Math.abs(end.x - g.startPage.x),
            h: Math.abs(end.y - g.startPage.y),
          });
          return;
        }

        if (g.type === "draw") {
          const raw = simplifyStroke(g.points, 1.5);
          if (raw.length < 2) return;
          const pad = 10;
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const p of raw) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
          const w = Math.max(BOARD_MIN_NODE_SIZE, maxX - minX + pad * 2);
          const h = Math.max(BOARD_MIN_NODE_SIZE, maxY - minY + pad * 2);
          const local = raw.map((p) => ({
            x: p.x - minX + pad,
            y: p.y - minY + pad,
          }));
          const noiDung = serializeDraw({
            color: g.color,
            width: g.width,
            points: local,
          });
          void (async () => {
            const created = await persist.createNode({
              loai: "sticky",
              layout: {
                x: minX - pad,
                y: minY - pad,
                w,
                h,
                mau: g.color,
                contentKind: "draw",
                z: zCounterRef.current++,
              },
              noiDung,
            });
            if (!created) return;
            const node: BoardNode = {
              ...created,
              layout: {
                ...created.layout,
                mau: g.color,
                contentKind: "draw",
              },
              noiDung: created.noiDung ?? noiDung,
            };
            addNodeInternal(node, true);
          })();
          return;
        }

        if (g.type === "wire") {
          const p = pageFromClient(e.clientX, e.clientY);
          const snapDist = WIRE_PORT_SNAP_DIST / cameraRef.current.z;
          const snap = resolveWirePortSnap(
            nodesRef.current,
            p,
            g.fromId,
            snapDist,
          );
          if (snap) {
            void createWire(g.fromId, snap.nodeId, {
              fromSide: g.fromSide,
              fromOffset: 0.5,
              toSide: snap.side,
              toOffset: snap.offset,
            });
          }
          return;
        }

        if (g.type === "wire-handle" && g.moved) {
          const n = byId(g.wireId);
          if (n) {
            history.push({
              type: "layout",
              before: g.before,
              after: [snapshotOf(n)],
            });
            persistNodeLayout(n);
            emitSelection();
          }
          return;
        }

        if (g.type === "move" && g.moved) {
          // Flush preview rồi commit tọa độ một lần khi thả.
          applyMovePreview(g.nodeIds, g.startPos, g.lastDx, g.lastDy);
          const idSet = new Set(g.nodeIds);
          let next = nodesRef.current.map((n) => {
            if (!idSet.has(n.id)) return n;
            const start = g.startPos.get(n.id);
            if (!start) return n;
            return {
              ...n,
              layout: {
                ...n.layout,
                x: start.x + g.lastDx,
                y: start.y + g.lastDy,
              },
            };
          });
          commitNodes(next);

          // Thả vào / ra frame: chỉ xét card kéo độc lập.
          // Card đi theo frame cha (kéo nhóm) giữ groupId — nếu tính lại,
          // frame cha nằm trong movingIds nên bị loại khỏi host → groupId=null.
          const movingIds = idSet;
          const movingFrameIds = new Set(
            next
              .filter((n) => n.loai === "frame" && movingIds.has(n.id))
              .map((n) => n.id),
          );
          const frames = next.filter(
            (n) => n.loai === "frame" && !movingIds.has(n.id),
          );
          const updates = new Map<string, string | null>();
          const leftFrameIds = new Set<string>();

          for (const id of g.nodeIds) {
            const n = next.find((x) => x.id === id);
            if (!n || n.loai === "frame") continue;
            const currentGid = n.layout.groupId ?? null;
            if (currentGid && movingFrameIds.has(currentGid)) continue;
            const nextGid = resolveGroupSnapId(nodeRect(n), frames, currentGid);
            if (currentGid !== nextGid) {
              updates.set(n.id, nextGid);
              if (currentGid) leftFrameIds.add(currentGid);
            }
          }

          if (updates.size > 0) {
            next = next.map((n) =>
              updates.has(n.id)
                ? {
                    ...n,
                    layout: { ...n.layout, groupId: updates.get(n.id) ?? null },
                  }
                : n,
            );
            commitNodes(next);
          }

          const extraBefore: BoardLayoutSnapshot[] = [];
          const extraAfter: BoardLayoutSnapshot[] = [];
          const persistExtra = new Set<string>();
          const frameResize = new Set<string>();
          for (const gid of updates.values()) {
            if (gid) frameResize.add(gid);
          }
          for (const id of g.nodeIds) {
            const n = next.find((x) => x.id === id);
            if (!n || n.loai === "frame") continue;
            if (n.layout.groupId && !movingFrameIds.has(n.layout.groupId)) {
              frameResize.add(n.layout.groupId);
            }
          }
          for (const gid of leftFrameIds) {
            if (!movingFrameIds.has(gid)) frameResize.add(gid);
          }
          if (frameResize.size > 0) {
            for (const frameId of frameResize) {
              const frame = next.find(
                (n) => n.id === frameId && n.loai === "frame",
              );
              if (!frame) continue;
              const members = next.filter(
                (n) => n.layout.groupId === frameId && n.loai !== "frame",
              );
              const fr = nodeRect(frame);
              const cover = frameFitMembers(members.map(nodeRect), fr);
              if (sameBoardRect(cover, fr)) continue;
              extraBefore.push(snapshotOf(frame));
              const grown: BoardNode = {
                ...frame,
                layout: {
                  ...frame.layout,
                  x: cover.x,
                  y: cover.y,
                  w: cover.w,
                  h: cover.h,
                },
              };
              next = next.map((n) => (n.id === frameId ? grown : n));
              extraAfter.push(snapshotOf(grown));
              persistExtra.add(frameId);
              for (const m of members) {
                if (!idSet.has(m.id)) persistExtra.add(m.id);
              }
            }
            commitNodes(next);
          }

          const after: BoardLayoutSnapshot[] = [];
          const persistIds = new Set<string>(g.nodeIds);
          for (const id of persistExtra) persistIds.add(id);
          for (const id of persistIds) {
            const n = next.find((x) => x.id === id);
            if (!n) continue;
            if (idSet.has(id)) after.push(snapshotOf(n));
          }
          for (const snap of extraAfter) {
            after.push(snap);
          }
          void persistLayoutBatch(
            [...persistIds]
              .map((id) => next.find((x) => x.id === id))
              .filter((n): n is BoardNode => Boolean(n)),
          );
          history.push({
            type: "layout",
            before: [...g.before, ...extraBefore],
            after,
          });
          clearGroupSnapUi(extraAfter.length === 0);
          emitSelection();
          return;
        }

        if (g.type === "resize" && g.moved) {
          const n = byId(g.nodeId);
          if (n) {
            const after = [snapshotOf(n)];
            const persistList: BoardNode[] = [n];
            const gid = n.loai !== "frame" ? n.layout.groupId : null;
            if (gid) {
              const frame = byId(gid);
              if (frame) {
                after.push(snapshotOf(frame));
                persistList.push(frame);
              }
            }
            void persistLayoutBatch(persistList);
            history.push({
              type: "layout",
              before: g.before,
              after,
            });
            emitSelection();
          }
        }
      },
      [
        addAreaText,
        addNodeInternal,
        addSticky,
        applyMovePreview,
        byId,
        commitNodes,
        createWire,
        emitSelection,
        history,
        pageFromClient,
        persist,
        persistLayoutBatch,
        persistNodeLayout,
        clearGroupSnapUi,
      ],
    );

    /* ---------- keyboard ---------- */
    /*
     * Shortcut gắn window (không chỉ onKeyDown của board): toolbar
     * `.cins-canvas-toolbar` nằm ngoài `.cins-board` nên click tool/undo
     * kéo focus ra ngoài — Delete/Ctrl+Z trước đây không tới handler.
     * Chỉ xử lý khi focus/target còn trong `.cins-canvas-wrap`.
     */
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        const root = rootRef.current;
        if (!root || !isCanvasKeyboardScope(root, e.target)) return;
        if (isTextEditingTarget(e.target)) return;

        if (e.key === " ") {
          if (editingRef.current) return;
          spaceHeldRef.current = true;
          setSpaceHeld(true);
          e.preventDefault();
          return;
        }

        // Delete khi đã chọn node — kể cả bảng vừa click (editingId) miễn
        // không đang gõ trong ô. isTextEditingTarget ở trên đã chặn input.
        if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedRef.current.size === 0) return;
          e.preventDefault();
          deleteSelection();
          return;
        }

        if (editingRef.current) return;

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key.toLowerCase() === "v") {
            setTool("select");
            return;
          }
          if (e.key.toLowerCase() === "h") {
            setTool("pan");
            return;
          }
          if (e.key.toLowerCase() === "d") {
            setTool("draw");
            return;
          }
          if (e.key.toLowerCase() === "t") {
            setTool("text");
            return;
          }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
          e.preventDefault();
          zoomIn();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "-") {
          e.preventDefault();
          zoomOut();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "0") {
          e.preventDefault();
          zoomReset();
          return;
        }
        if (e.key === "Escape") {
          if (
            toolRef.current === "draw" ||
            isBoardPlaceTool(toolRef.current)
          ) {
            setTool("select");
            return;
          }
          setSelection(new Set());
        }
      };

      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key !== " ") return;
        const root = rootRef.current;
        if (!root) return;
        // Nhả Space kể cả khi focus đã rời wrap giữa chừng (tránh kẹt pan).
        if (
          !isCanvasKeyboardScope(root, e.target) &&
          !spaceHeldRef.current
        ) {
          return;
        }
        spaceHeldRef.current = false;
        setSpaceHeld(false);
      };

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, [
      deleteSelection,
      redo,
      setSelection,
      setTool,
      undo,
      zoomIn,
      zoomOut,
      zoomReset,
    ]);

    /* ---------- ảnh: kéo từ máy / share-drag / Ctrl+V ---------- */

    const createImageNodeAt = useCallback(
      async (url: string, page: { x: number; y: number }) => {
        const natural = await readImageNaturalSize(url);
        const size = natural
          ? fitBoardImageSize(natural.w, natural.h)
          : { w: BOARD_DEFAULT_NODE_W, h: BOARD_DEFAULT_NODE_H };
        const created = await persist.createNode({
          loai: "anh",
          layout: {
            x: page.x - size.w / 2,
            y: page.y - size.h / 2,
            w: size.w,
            h: size.h,
            imageFitted: true,
          },
          url,
        });
        if (created) addNodeInternal(created, true);
      },
      [addNodeInternal, persist],
    );

    const createLinkNodeAt = useCallback(
      async (url: string, page: { x: number; y: number }) => {
        const created = await persist.createNode({
          loai: "link",
          layout: {
            x: page.x - 140,
            y: page.y - 110,
            w: 280,
            h: 220,
          },
          url,
        });
        if (created) addNodeInternal(created, true);
      },
      [addNodeInternal, persist],
    );

    /**
     * Paste / drop file: hiện ảnh blob NGAY + loading, upload ngầm rồi
     * đổi sang URL thật (không chờ upload mới hiện node).
     */
    const ingestImageFiles = useCallback(
      async (files: File[], page: { x: number; y: number }) => {
        if (!uploadImage || lockedRef.current) return;

        const canvasId =
          nodesRef.current.find((n) => n.canvasId)?.canvasId ?? "";
        const now = new Date().toISOString();
        let offset = 0;
        const jobs: Array<Promise<void>> = [];

        for (const file of files) {
          if (!isAllowedUploadImageFile(file)) continue;

          const tempId = `local-img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
          const blobUrl = URL.createObjectURL(file);
          const natural = await readImageNaturalSize(blobUrl);
          const size = natural
            ? fitBoardImageSize(natural.w, natural.h)
            : { w: BOARD_DEFAULT_NODE_W, h: BOARD_DEFAULT_NODE_H };
          const layout = {
            x: page.x + offset - size.w / 2,
            y: page.y + offset - size.h / 2,
            w: size.w,
            h: size.h,
            z: ++zCounterRef.current,
            imageFitted: true as const,
          };
          offset += 32;

          const optimistic: BoardNode = {
            id: tempId,
            canvasId,
            loai: "anh",
            messageId: null,
            url: blobUrl,
            noiDung: null,
            layout,
            idNguoiTao: "",
            taoLuc: now,
            capNhatLuc: now,
          };

          commitNodes([...nodesRef.current, optimistic]);
          setSelection(new Set([tempId]));
          setUploadingIds((prev) => new Set(prev).add(tempId));
          emitSelection();
          requestAnimationFrame(() => zoomToNode(optimistic));

          jobs.push(
            (async () => {
              const wasCancelled = () =>
                cancelledLocalIdsRef.current.has(tempId) ||
                !nodesRef.current.some((n) => n.id === tempId);

              const clearUploading = () => {
                setUploadingIds((prev) => {
                  if (!prev.has(tempId)) return prev;
                  const next = new Set(prev);
                  next.delete(tempId);
                  return next;
                });
              };

              const discardBlob = () => {
                if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
              };

              const removeTempLocal = () => {
                discardBlob();
                commitNodes(nodesRef.current.filter((n) => n.id !== tempId));
                clearUploading();
                if (selectedRef.current.has(tempId)) {
                  setSelection(new Set());
                  emitSelection();
                }
              };

              /** Upload đã lên CF nhưng user hủy — tạo rồi xóa để server dọn CF. */
              const purgeOrphanUpload = async (url: string) => {
                const orphan = await persist.createNode({
                  loai: "anh",
                  layout,
                  url,
                });
                if (orphan) await persist.deleteNode(orphan);
              };

              const remoteUrl = await uploadImage(file);

              if (!remoteUrl) {
                if (!wasCancelled()) removeTempLocal();
                else {
                  discardBlob();
                  clearUploading();
                }
                cancelledLocalIdsRef.current.delete(tempId);
                return;
              }

              if (wasCancelled()) {
                discardBlob();
                clearUploading();
                await purgeOrphanUpload(remoteUrl);
                cancelledLocalIdsRef.current.delete(tempId);
                return;
              }

              const current = nodesRef.current.find((n) => n.id === tempId);
              const created = await persist.createNode({
                loai: "anh",
                layout: current?.layout ?? layout,
                url: remoteUrl,
              });

              if (!created) {
                if (!wasCancelled()) removeTempLocal();
                else {
                  discardBlob();
                  clearUploading();
                }
                cancelledLocalIdsRef.current.delete(tempId);
                return;
              }

              if (wasCancelled()) {
                discardBlob();
                clearUploading();
                await persist.deleteNode(created);
                cancelledLocalIdsRef.current.delete(tempId);
                return;
              }

              const latest = nodesRef.current.find((n) => n.id === tempId);
              if (!latest) {
                discardBlob();
                clearUploading();
                await persist.deleteNode(created);
                cancelledLocalIdsRef.current.delete(tempId);
                return;
              }

              const finalNode: BoardNode = {
                ...created,
                layout: { ...created.layout, ...latest.layout },
                url: remoteUrl,
              };

              commitNodes(
                nodesRef.current.map((n) =>
                  n.id === tempId ? finalNode : n,
                ),
              );
              discardBlob();
              clearUploading();
              cancelledLocalIdsRef.current.delete(tempId);

              // Race: user xóa đúng lúc replace — nếu final không còn thì thôi.
              if (!nodesRef.current.some((n) => n.id === finalNode.id)) {
                await persist.deleteNode(finalNode);
                return;
              }

              if (selectedRef.current.has(tempId)) {
                setSelection(new Set([finalNode.id]));
              }
              history.push({ type: "create", node: finalNode });
              if (
                latest.layout.x !== created.layout.x ||
                latest.layout.y !== created.layout.y ||
                latest.layout.w !== created.layout.w ||
                latest.layout.h !== created.layout.h
              ) {
                void persist.patchNode(finalNode.id, {
                  layout: finalNode.layout,
                });
              }
              emitSelection();
            })(),
          );
        }

        await Promise.all(jobs);
      },
      [
        commitNodes,
        emitSelection,
        history,
        persist,
        setSelection,
        uploadImage,
        zoomToNode,
      ],
    );

    const onDrop = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        if (lockedRef.current) return;
        const page = pageFromClient(e.clientX, e.clientY);

        const share = readShareDragData(e.dataTransfer);
        if (share) {
          e.preventDefault();
          e.stopPropagation();
          if (share.kind === "image") {
            const url =
              chatImageDeliveryUrl(share.imageId) ?? share.url ?? null;
            if (url) void createImageNodeAt(url, page);
          } else {
            void createLinkNodeAt(share.url, page);
          }
          return;
        }

        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length > 0) {
          e.preventDefault();
          void ingestImageFiles(files, page);
        }
      },
      [createImageNodeAt, createLinkNodeAt, ingestImageFiles, pageFromClient],
    );

    const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
      if (lockedRef.current) return;
      if (
        hasShareDragData(e.dataTransfer) ||
        Array.from(e.dataTransfer.types).includes("Files")
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
      }
    }, []);

    const onPaste = useCallback(
      (e: ReactClipboardEvent<HTMLDivElement>) => {
        if (editingRef.current || lockedRef.current) return;
        const files = imageFilesFromClipboard(e.clipboardData);
        if (files.length === 0) return;
        e.preventDefault();
        const rect = rootRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        const page = {
          x: (rect?.width ?? 800) / 2 / cam.z - cam.x,
          y: (rect?.height ?? 600) / 2 / cam.z - cam.y,
        };
        void ingestImageFiles(files, page);
      },
      [ingestImageFiles],
    );

    /* ---------- imperative handle ---------- */

    useImperativeHandle(
      handleRef,
      (): BoardHandle => ({
        addNode: (node) => addNodeInternal(node, true),
        ingestNode,
        addSticky,
        addText,
        addShape,
        addTable,
        addComment,
        highlightNodes,
        applyColorToSelection,
        renameSelectedFrame,
        groupSelection,
        ungroupSelection,
        deleteSelection,
        clearBoard,
        setTool,
        zoomIn,
        zoomOut,
        zoomReset,
        zoomToFit,
        autoLayout,
        undo,
        redo,
      }),
      [
        addNodeInternal,
        addShape,
        addSticky,
        addTable,
        addText,
        addComment,
        applyColorToSelection,
        clearBoard,
        deleteSelection,
        groupSelection,
        highlightNodes,
        ingestNode,
        redo,
        renameSelectedFrame,
        setTool,
        undo,
        ungroupSelection,
        zoomIn,
        zoomOut,
        zoomReset,
        zoomToFit,
        autoLayout,
      ],
    );

    /* ---------- render ---------- */

    const ordered = useMemo(() => {
      const frames = nodes
        .filter((n) => n.loai === "frame")
        .sort((a, b) => (a.layout.z ?? 0) - (b.layout.z ?? 0));
      const cards = nodes
        .filter((n) => n.loai !== "frame" && n.loai !== "connector")
        .sort((a, b) => (a.layout.z ?? 0) - (b.layout.z ?? 0));
      return [...frames, ...cards];
    }, [nodes]);

    const wires = useMemo(
      () => nodes.filter((n) => n.loai === "connector"),
      [nodes],
    );

    const nodesById = useMemo(() => {
      const map = new Map<string, BoardNode>();
      for (const n of nodes) map.set(n.id, n);
      return map;
    }, [nodes]);

    const singleSelectedId =
      selectedIds.size === 1 ? [...selectedIds][0]! : null;

    /* ---------- thanh thao tác nổi trên selection ---------- */

    const selectedNodes = useMemo(
      () => nodes.filter((n) => selectedIds.has(n.id)),
      [nodes, selectedIds],
    );

    const selectionBar = (() => {
      if (
        locked ||
        interacting ||
        panning ||
        marqueeRect ||
        editingId ||
        selectedNodes.length === 0
      ) {
        return null;
      }

      const selFrame =
        selectedNodes.length === 1 && selectedNodes[0]!.loai === "frame"
          ? selectedNodes[0]!
          : null;
      const cards = selectedNodes.filter(
        (n) => n.loai !== "frame" && n.loai !== "connector",
      );
      const selectedWires = selectedNodes.filter((n) => n.loai === "connector");
      const selectedShapes = cards.filter((n) =>
        Boolean(normalizeShapeKind(n.layout.shapeKind)),
      );
      const canGroup = !selFrame && cards.length >= 2;
      const canAlign = canGroup;
      const selectedFrames = selectedNodes.filter((n) => n.loai === "frame");
      const canAutoLayoutSel =
        selectedFrames.length >= 1 || cards.length >= 2;
      const cardPoolCount = nodes.filter(
        (n) => n.loai !== "frame" && n.loai !== "connector",
      ).length;
      const framePoolCount = nodes.filter((n) => n.loai === "frame").length;
      const layerTargets = selectedNodes.filter((n) => n.loai !== "connector");
      const canLayerOrder =
        layerTargets.length >= 1 &&
        ((layerTargets.some((n) => n.loai !== "frame") &&
          cardPoolCount >= 2) ||
          (layerTargets.some((n) => n.loai === "frame") &&
            framePoolCount >= 2));
      const hasTextBlock = cards.some(isTextStickyNode);
      const hasStickyNote = cards.some(
        (n) =>
          n.loai === "sticky" &&
          !normalizeShapeKind(n.layout.shapeKind) &&
          !isTextStickyNode(n),
      );
      const hasShape = selectedShapes.length > 0;
      const showWireOptions =
        selectedWires.length > 0 && cards.length === 0 && !selFrame;
      const activeWireStyle = showWireOptions
        ? normalizeWireStyle(selectedWires[0]?.layout.wireStyle)
        : null;
      const activeWireArrow = showWireOptions
        ? normalizeWireArrow(selectedWires[0]?.layout.wireArrow)
        : null;
      const activeShapeKind = hasShape
        ? normalizeShapeKind(selectedShapes[0]?.layout.shapeKind)
        : null;

      // Connector không có rect riêng — lấy bbox theo điểm neo dây.
      const rects = selectedNodes
        .map((n) => {
          if (n.loai !== "connector") return nodeRect(n);
          const a = nodes.find((x) => x.id === n.layout.from);
          const b = nodes.find((x) => x.id === n.layout.to);
          if (!a || !b) return null;
          const path = wirePathBetween(
            nodeRect(a),
            nodeRect(b),
            normalizeWireStyle(n.layout.wireStyle),
            wireRouteOptsFromLayout(n.layout),
          );
          return {
            x: Math.min(path.from.x, path.to.x),
            y: Math.min(path.from.y, path.to.y),
            w: Math.abs(path.to.x - path.from.x),
            h: Math.abs(path.to.y - path.from.y),
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
      if (rects.length === 0) return null;
      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.x + r.w));
      const maxY = Math.max(...rects.map((r) => r.y + r.h));

      const cx = ((minX + maxX) / 2 + camera.x) * camera.z;
      const topScreen = (minY + camera.y) * camera.z;
      // Sát mép trên viewport → lật thanh xuống dưới selection.
      const flip = topScreen < 56;
      const y = flip ? (maxY + camera.y) * camera.z + 10 : topScreen - 10;

      const palette = selFrame
        ? GROUP_PALETTE
        : hasTextBlock && !hasStickyNote && !hasShape
          ? TEXT_COLOR_PALETTE
          : STICKY_PALETTE;
      const activeColor = selFrame
        ? (selFrame.layout.mau ?? GROUP_PALETTE[0])
        : hasTextBlock && !hasStickyNote && !hasShape
          ? (cards.find(isTextStickyNode)?.layout.textColor ??
            DEFAULT_TEXT_COLOR)
          : cards.find((n) => n.loai === "sticky")?.layout.mau;
      const customActive =
        Boolean(activeColor) &&
        !isPresetPaletteColor(activeColor, palette);
      const showTextOptions =
        hasTextBlock && !hasStickyNote && !hasShape && !selFrame;
      const activeTextSize = showTextOptions
        ? normalizeTextSize(cards.find(isTextStickyNode)?.layout.textSize)
        : null;

      return (
        <div
          className="cins-board-selbar"
          role="toolbar"
          aria-label="Thao tác với mục đã chọn"
          style={{
            left: `clamp(140px, ${Math.round(cx)}px, calc(100% - 140px))`,
            top: Math.round(y),
            transform: flip ? "translate(-50%, 0)" : "translate(-50%, -100%)",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {selFrame ? (
            <input
              className="cins-canvas-group-name"
              value={selFrame.noiDung ?? ""}
              aria-label="Tên nhóm"
              placeholder="Tên nhóm"
              onChange={(e) => renameSelectedFrame(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          ) : null}
          {selFrame || hasStickyNote || hasTextBlock || hasShape ? (
            <div
              className="cins-canvas-palette"
              role="group"
              aria-label={
                selFrame
                  ? "Màu nền nhóm"
                  : hasTextBlock && !hasStickyNote && !hasShape
                    ? "Màu chữ"
                    : hasShape && !hasStickyNote
                      ? "Màu hình"
                      : "Màu ghi chú"
              }
            >
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={
                    "cins-canvas-swatch" +
                    (activeColor === color ? " is-active" : "")
                  }
                  style={{ background: color }}
                  aria-label={`Màu ${color}`}
                  aria-pressed={activeColor === color}
                  onClick={() => applyColorToSelection(color)}
                />
              ))}
              <CanvasColorWheelInput
                value={
                  activeColor ??
                  (selFrame
                    ? "#1f74c9"
                    : hasTextBlock && !hasStickyNote && !hasShape
                      ? DEFAULT_TEXT_COLOR
                      : STICKY_PALETTE[0]!)
                }
                isActive={customActive}
                ariaLabel={
                  selFrame
                    ? "Màu nhóm tùy chọn"
                    : hasTextBlock && !hasStickyNote && !hasShape
                      ? "Màu chữ tùy chọn"
                      : "Màu tùy chọn"
                }
                onPreview={(hex) =>
                  previewColorOnSelection(
                    selFrame ? hexToGroupTint(hex) : hex,
                  )
                }
                onPick={(hex) =>
                  commitPreviewedSelectionColor(
                    selFrame ? hexToGroupTint(hex) : hex,
                  )
                }
              />
            </div>
          ) : null}
          {showTextOptions ? (
            <div
              className="cins-board-wire-opts"
              role="group"
              aria-label="Cỡ chữ"
            >
              {TEXT_SIZE_PRESETS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={
                    "cins-board-wire-opt cins-board-text-size-opt" +
                    (activeTextSize === size ? " is-active" : "")
                  }
                  title={`Cỡ chữ ${size}px`}
                  aria-label={`Cỡ chữ ${size}px`}
                  aria-pressed={activeTextSize === size}
                  onClick={() => applyTextSizeToSelection(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          ) : null}
          {hasShape && !selFrame ? (
            <div
              className="cins-board-wire-opts"
              role="group"
              aria-label="Kiểu hình"
            >
              {SHAPE_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={
                    "cins-board-wire-opt" +
                    (activeShapeKind === kind ? " is-active" : "")
                  }
                  title={SHAPE_KIND_LABEL[kind]}
                  aria-label={SHAPE_KIND_LABEL[kind]}
                  aria-pressed={activeShapeKind === kind}
                  onClick={() => applyShapeKindToSelection(kind)}
                >
                  <ShapeKindIcon kind={kind} />
                </button>
              ))}
            </div>
          ) : null}
          {showWireOptions ? (
            <>
              <div
                className="cins-board-wire-opts"
                role="group"
                aria-label="Kiểu đường nối"
              >
                {WIRE_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    className={
                      "cins-board-wire-opt" +
                      (activeWireStyle === style ? " is-active" : "")
                    }
                    title={WIRE_STYLE_LABEL[style]}
                    aria-label={WIRE_STYLE_LABEL[style]}
                    aria-pressed={activeWireStyle === style}
                    onClick={() => applyWireStyleToSelection(style)}
                  >
                    <WireStyleIcon style={style} />
                  </button>
                ))}
              </div>
              <div
                className="cins-board-wire-opts"
                role="group"
                aria-label="Mũi tên dây nối"
              >
                {WIRE_ARROWS.map((arrow) => (
                  <button
                    key={arrow}
                    type="button"
                    className={
                      "cins-board-wire-opt" +
                      (activeWireArrow === arrow ? " is-active" : "")
                    }
                    title={WIRE_ARROW_LABEL[arrow]}
                    aria-label={WIRE_ARROW_LABEL[arrow]}
                    aria-pressed={activeWireArrow === arrow}
                    onClick={() => applyWireArrowToSelection(arrow)}
                  >
                    <WireArrowIcon arrow={arrow} />
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {canLayerOrder ? (
            <div
              className="cins-board-selbar-group"
              role="group"
              aria-label="Lớp"
            >
              <div
                className="cins-board-wire-opts"
                role="group"
                aria-label="Thứ tự lớp"
              >
                {SELECTION_LAYER_ACTIONS.map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    className="cins-board-wire-opt"
                    title={label}
                    aria-label={label}
                    onClick={() => reorderSelectionLayer(mode)}
                  >
                    <Icon size={14} strokeWidth={1.9} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {canAlign || canGroup || canAutoLayoutSel ? (
            <div
              className="cins-board-selbar-group"
              role="group"
              aria-label="Sắp xếp"
            >
              <div
                className="cins-board-wire-opts"
                role="group"
                aria-label="Căn chỉnh"
              >
                {canAlign
                  ? SELECTION_ALIGN_ACTIONS.map(({ mode, label, Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        className="cins-board-wire-opt"
                        title={label}
                        aria-label={label}
                        onClick={() => alignSelection(mode)}
                      >
                        <Icon size={14} strokeWidth={1.9} aria-hidden />
                      </button>
                    ))
                  : null}
                {canGroup ? (
                  <button
                    type="button"
                    className="cins-board-wire-opt"
                    onClick={() => groupSelection(GROUP_PALETTE[0]!)}
                    title="Gom các mục đã chọn thành một nhóm"
                    aria-label="Nhóm"
                  >
                    <Group size={14} strokeWidth={1.9} aria-hidden />
                  </button>
                ) : null}
                {canAutoLayoutSel ? (
                  <button
                    type="button"
                    className="cins-board-wire-opt"
                    onClick={autoLayoutSelection}
                    title="Tự sắp xếp các mục đã chọn"
                    aria-label="Tự sắp xếp"
                  >
                    <AlignHorizontalSpaceAround
                      size={14}
                      strokeWidth={1.9}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {selFrame ? (
            <button
              type="button"
              className="cins-canvas-tool-btn"
              onClick={() => void ungroupSelection()}
              title="Tách nhóm — giữ các block con"
            >
              <Ungroup size={14} strokeWidth={1.9} aria-hidden />
              Bỏ nhóm
            </button>
          ) : null}
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon cins-canvas-tool-btn--danger"
            onClick={deleteSelection}
            title="Xóa mục đã chọn (Delete)"
            aria-label="Xóa mục đã chọn"
          >
            <Trash2 size={14} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      );
    })();

    return (
      <div
        ref={rootRef}
        className={
          "cins-board" +
          (panning || spaceHeld || tool === "pan" ? " is-panning" : "") +
          (tool === "draw" ? " is-drawing" : "") +
          (tool === "text" ? " is-text-tool" : "") +
          (isBoardPlaceTool(tool) && tool !== "text" ? " is-place-tool" : "") +
          (locked ? " is-locked" : "") +
          (wireDraft ? " is-wiring" : "")
        }
        tabIndex={0}
        role="application"
        aria-label="Canvas ý tưởng"
        onPointerDown={onRootPointerDown}
        onPointerMove={onRootPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaste={onPaste}
      >
        <BoardDotGrid camera={camera} />
        {nodesProp !== null && nodes.length === 0 ? (
          <div className="cins-board-empty" aria-hidden>
            <p>Canvas trống — bắt đầu bằng cách:</p>
            <ul>
              <li>Bấm icon ghi chú / chữ / hình / bảng / bình luận rồi click canvas để đặt</li>
              <li>Chọn bút vẽ (D) rồi kéo trên nền trống để vẽ tự do</li>
              <li>Kéo ảnh từ máy vào đây, hoặc dán ảnh (Ctrl+V)</li>
              <li>Trong tin nhắn có ảnh/link: menu ⋯ → «Thêm vào canvas»</li>
              <li>«Đồng bộ» để gom ảnh/link đã gửi trong phòng</li>
            </ul>
          </div>
        ) : null}
        <div ref={worldRef} className="cins-board-world">
          <svg className="cins-board-wires" width="1" height="1" aria-hidden>
            <defs>
              {/*
                Một marker dùng cho cả đầu & cuối.
                `auto-start-reverse` đảo hướng khi gắn marker-start
                (không cần path riêng — tránh đảo kép → mũi tên biến mất).
              */}
              <marker
                id="cins-wire-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
                markerUnits="strokeWidth"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            {wires.map((w) => {
              const a = w.layout.from ? nodesById.get(w.layout.from) : undefined;
              const b = w.layout.to ? nodesById.get(w.layout.to) : undefined;
              if (!a || !b) return null;
              const style = normalizeWireStyle(w.layout.wireStyle);
              const arrow = normalizeWireArrow(w.layout.wireArrow);
              const path = wirePathBetween(
                nodeRect(a),
                nodeRect(b),
                style,
                wireRouteOptsFromLayout(w.layout),
              );
              const selected = selectedIds.has(w.id);
              const showLegacyMid =
                selected && !locked && path.anchors.length === 0;
              return (
                <g
                  key={w.id}
                  ref={(el) => {
                    if (el) wireElByIdRef.current.set(w.id, el);
                    else wireElByIdRef.current.delete(w.id);
                  }}
                  className={
                    "cins-board-wire" + (selected ? " is-selected" : "")
                  }
                  onPointerDown={(e) => {
                    if (pinchRef.current) {
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                    if (
                      e.button !== 0 ||
                      spaceHeldRef.current ||
                      toolRef.current === "pan"
                    ) {
                      return;
                    }
                    e.stopPropagation();
                    rootRef.current?.focus({ preventScroll: true });
                    const already = selectedRef.current.has(w.id);
                    const ids = e.shiftKey
                      ? new Set([...selectedRef.current, w.id])
                      : new Set([w.id]);
                    setSelection(ids);
                    if (already && !e.shiftKey && !lockedRef.current) {
                      const page = pageFromClient(e.clientX, e.clientY);
                      const hit = closestPointOnPoly(path.poly, page);
                      if (hit && hit.dist <= WIRE_SNAP_MAX_DIST) {
                        wirePathClickRef.current = {
                          wireId: w.id,
                          pointerId: e.pointerId,
                          startClient: { x: e.clientX, y: e.clientY },
                          point: hit.point,
                        };
                      } else {
                        wirePathClickRef.current = null;
                      }
                    } else {
                      wirePathClickRef.current = null;
                    }
                  }}
                  onPointerMove={(e) => {
                    if (!selected || locked || gestureRef.current) {
                      if (wireSnap?.wireId === w.id) setWireSnap(null);
                      return;
                    }
                    const page = pageFromClient(e.clientX, e.clientY);
                    const hit = closestPointOnPoly(path.poly, page);
                    if (hit && hit.dist <= WIRE_SNAP_MAX_DIST) {
                      const nearEnd =
                        Math.hypot(
                          hit.point.x - path.from.x,
                          hit.point.y - path.from.y,
                        ) < 14 ||
                        Math.hypot(
                          hit.point.x - path.to.x,
                          hit.point.y - path.to.y,
                        ) < 14 ||
                        path.anchors.some(
                          (pt) =>
                            Math.hypot(
                              hit.point.x - pt.x,
                              hit.point.y - pt.y,
                            ) < 14,
                        );
                      if (nearEnd) {
                        if (wireSnap?.wireId === w.id) setWireSnap(null);
                        return;
                      }
                      setWireSnap({
                        wireId: w.id,
                        x: hit.point.x,
                        y: hit.point.y,
                      });
                    } else if (wireSnap?.wireId === w.id) {
                      setWireSnap(null);
                    }
                  }}
                  onPointerLeave={() => {
                    if (wireSnap?.wireId === w.id) setWireSnap(null);
                  }}
                  onPointerUp={(e) => {
                    const pending = wirePathClickRef.current;
                    if (
                      !pending ||
                      pending.pointerId !== e.pointerId ||
                      pending.wireId !== w.id
                    ) {
                      return;
                    }
                    wirePathClickRef.current = null;
                    if (
                      Math.hypot(
                        e.clientX - pending.startClient.x,
                        e.clientY - pending.startClient.y,
                      ) > DRAG_THRESHOLD_PX
                    ) {
                      return;
                    }
                    addWireAnchorAt(w.id, pending.point);
                  }}
                >
                  <path className="cins-board-wire-hit" d={path.d} />
                  <path
                    className="cins-board-wire-line"
                    d={path.d}
                    markerStart={
                      arrow === "both"
                        ? "url(#cins-wire-arrow)"
                        : undefined
                    }
                    markerEnd={
                      arrow === "none" ? undefined : "url(#cins-wire-arrow)"
                    }
                  />
                  {selected && !locked ? (
                    <g className="cins-board-wire-anchors">
                      <circle
                        className="cins-board-wire-anchor"
                        cx={path.from.x}
                        cy={path.from.y}
                        r={6}
                        aria-label="Điểm neo đầu"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          startWireHandle(e, w.id, "from");
                        }}
                      />
                      {path.anchors.map((pt, i) => (
                        <circle
                          key={`a-${i}`}
                          className="cins-board-wire-anchor is-mid"
                          cx={pt.x}
                          cy={pt.y}
                          r={6}
                          aria-label={`Điểm neo ${i + 1}`}
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            startWireHandle(e, w.id, "anchor", i);
                          }}
                        />
                      ))}
                      {showLegacyMid ? (
                        <circle
                          className="cins-board-wire-anchor is-mid"
                          cx={path.mid.x}
                          cy={path.mid.y}
                          r={6}
                          aria-label="Điểm uốn dây"
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            startWireHandle(e, w.id, "mid");
                          }}
                        />
                      ) : null}
                      <circle
                        className="cins-board-wire-anchor"
                        cx={path.to.x}
                        cy={path.to.y}
                        r={6}
                        aria-label="Điểm neo đích"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          startWireHandle(e, w.id, "to");
                        }}
                      />
                      {wireSnap && wireSnap.wireId === w.id ? (
                        <circle
                          className="cins-board-wire-snap"
                          cx={wireSnap.x}
                          cy={wireSnap.y}
                          r={5}
                          aria-hidden
                        />
                      ) : null}
                    </g>
                  ) : null}
                </g>
              );
            })}
            {wireDraft
              ? (() => {
                  const from = nodesById.get(wireDraft.fromId);
                  if (!from) return null;
                  const target = wireDraft.targetId
                    ? nodesById.get(wireDraft.targetId)
                    : null;
                  const draftOpts = {
                    fromSide: wireDraft.fromSide,
                    fromOffset: 0.5,
                    ...(wireDraft.toSide
                      ? { toSide: wireDraft.toSide, toOffset: 0.5 }
                      : {}),
                  };
                  return (
                    <path
                      className="cins-board-wire-draft"
                      d={wirePathDraft(
                        nodeRect(from),
                        { x: wireDraft.x, y: wireDraft.y },
                        target ? nodeRect(target) : null,
                        "curve",
                        draftOpts,
                      )}
                      markerEnd="url(#cins-wire-arrow)"
                    />
                  );
                })()
              : null}
            {drawDraft && drawDraft.points.length > 0 ? (
              <path
                className="cins-board-draw-draft"
                d={pointsToSvgPath(drawDraft.points)}
                fill="none"
                stroke={drawDraft.color}
                strokeWidth={drawDraft.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
          {ordered.map((node) => {
            const r = nodeRect(node);
            const selected = selectedIds.has(node.id);
            const contentKind = normalizeContentKind(node.layout.contentKind);
            const isComment = contentKind === "comment";
            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) nodeElByIdRef.current.set(node.id, el);
                  else nodeElByIdRef.current.delete(node.id);
                }}
                className={
                  `cins-board-node cins-canvas-shape cins-canvas-shape--${node.loai}` +
                  (selected ? " is-selected" : "") +
                  (highlightIds.has(node.id) ? " is-highlight" : "") +
                  (isComment ? " is-comment" : "") +
                  (contentKind === "table" ? " is-table" : "") +
                  (justPlacedIds.has(node.id) ? " is-just-placed" : "") +
                  (wireDraft?.targetId === node.id ? " is-wire-target" : "")
                }
                style={{
                  transform: `translate(${r.x}px, ${r.y}px)`,
                  width: r.w,
                  height: r.h,
                }}
                onPointerDown={(e) => {
                  if (pinchRef.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                  }
                  if (e.button !== 0 || spaceHeldRef.current) return;
                  // Tool bàn tay: node không nuốt event — root pan.
                  if (toolRef.current === "pan") return;
                  // Tool vẽ/chữ: nền trống mới tạo — click node vẫn chọn/kéo.
                  if (
                    toolRef.current === "draw" ||
                    isBoardPlaceTool(toolRef.current)
                  ) {
                    e.stopPropagation();
                    if (
                      isBoardPlaceTool(toolRef.current) &&
                      (e.ctrlKey || e.metaKey)
                    ) {
                      setTool("select");
                      setEditingId(null);
                      e.stopPropagation();
                      return;
                    }
                    startMove(e, node.id);
                    return;
                  }

                  const isTable = contentKind === "table";
                  const target = e.target as HTMLElement | null;
                  const fromTableDrag = Boolean(
                    target?.closest?.("[data-table-drag]"),
                  );

                  if (isTable && !locked) {
                    // Kéo từ thanh grip → di chuyển; còn lại → chọn + sửa ô.
                    if (fromTableDrag) {
                      e.stopPropagation();
                      startMove(e, node.id);
                      return;
                    }
                    e.stopPropagation();
                    rootRef.current?.focus({ preventScroll: true });
                    setSelection(new Set([node.id]));
                    setEditingId(node.id);
                    return;
                  }

                  // Đang sửa sticky/bảng: đừng để event lên root (marquee).
                  if (editingId === node.id) {
                    e.stopPropagation();
                    return;
                  }
                  e.stopPropagation();
                  startMove(e, node.id);
                }}
                onDoubleClick={(e) => {
                  if (node.loai !== "sticky" || locked) return;
                  if (contentKind === "draw") return;
                  if (contentKind === "table") return; // bảng: click là đủ
                  e.stopPropagation();
                  setEditingId(node.id);
                }}
              >
                <NodeCard
                  node={node}
                  editing={editingId === node.id}
                  selected={selected}
                  locked={locked}
                  uploading={uploadingIds.has(node.id)}
                  onJumpToMessage={onJumpToMessage}
                  onCommitText={commitNodeText}
                  onCommitTable={commitTable}
                  onCancelEdit={cancelNodeEdit}
                  onRequestEdit={requestNodeEdit}
                  onImageNaturalSize={fitImageNode}
                  onCommentSize={fitCommentNode}
                  onTextFitSize={fitTextNodeSize}
                />
                {!locked ? (
                  <>
                    {WIRE_SIDES.map((side) => (
                      <span
                        key={side}
                        className={`cins-board-wire-port cins-board-wire-port--${side}`}
                        title="Kéo để nối dây sang block khác"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          startWire(e, node.id, side);
                        }}
                      />
                    ))}
                  </>
                ) : null}
                {selected &&
                !locked &&
                singleSelectedId === node.id &&
                !isComment ? (
                  <>
                    {(["nw", "ne", "sw", "se"] as Corner[]).map((corner) => (
                      <span
                        key={corner}
                        className={`cins-board-handle cins-board-handle--${corner}`}
                        onPointerDown={(e) => startResize(e, node.id, corner)}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            );
          })}
          {marqueeRect ? (
            <div
              className={
                "cins-board-marquee" +
                (marqueeRect.kind === "place" ? " is-place-text" : "")
              }
              style={{
                transform: `translate(${marqueeRect.x}px, ${marqueeRect.y}px)`,
                width: marqueeRect.w,
                height: marqueeRect.h,
              }}
              aria-hidden
            />
          ) : null}
        </div>
        {selectionBar}
      </div>
    );
  },
);
