"use client";

/**
 * CinsBoard — infinite canvas engine tự viết (thay tldraw).
 *
 * - Camera pan/zoom bằng CSS transform trên một world layer.
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
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Group, Trash2, Ungroup } from "lucide-react";

import {
  NodeCard,
  CustomColorSwatch,
  GROUP_PALETTE,
  SHAPE_KINDS,
  STICKY_PALETTE,
  TEXT_STICKY_MAU,
  hexToGroupTint,
  isPresetPaletteColor,
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
  BOARD_MAX_ZOOM,
  BOARD_MIN_NODE_SIZE,
  BOARD_MIN_ZOOM,
  fitBoardImageSize,
  nodeRect,
  type BoardCamera,
  type BoardHandle,
  type BoardNode,
  type BoardPersistAdapter,
  type BoardSelectionSummary,
  type BoardTool,
} from "@/components/cins/board/board-types";
import {
  closestPointOnPoly,
  insertWireAnchor,
  nearestEdgeAttachment,
  normalizeWireArrow,
  normalizeWireStyle,
  WIRE_ARROWS,
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
const DRAG_THRESHOLD_PX = 3;

function isLocalBoardNodeId(id: string): boolean {
  return id.startsWith("local-");
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
    };

/** Ngưỡng (page units) để hiện điểm snap trên path. */
const WIRE_SNAP_MAX_DIST = 18;

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

function hitNodeAt(
  list: BoardNode[],
  p: { x: number; y: number },
  excludeId?: string,
): BoardNode | null {
  return (
    [...list]
      .filter((n) => n.loai !== "connector" && n.id !== excludeId)
      .sort((a, b) => {
        const fa = a.loai === "frame" ? 0 : 1;
        const fb = b.loai === "frame" ? 0 : 1;
        return fa - fb || (a.layout.z ?? 0) - (b.layout.z ?? 0);
      })
      .reverse()
      .find((n) => {
        const r = nodeRect(n);
        return (
          p.x >= r.x &&
          p.x <= r.x + r.w &&
          p.y >= r.y &&
          p.y <= r.y + r.h
        );
      }) ?? null
  );
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
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
    const [nodes, setNodes] = useState<BoardNode[]>([]);
    const [camera, setCamera] = useState<BoardCamera>({ x: 0, y: 0, z: 1 });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
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
      inkColorRef.current = inkColor;
    }, [inkColor]);

    const gestureRef = useRef<Gesture | null>(null);
    const hydratedRef = useRef(false);
    const zCounterRef = useRef(1);
    /** Paste/upload bị user xóa giữa chừng — chặn create xong hiện lại. */
    const cancelledLocalIdsRef = useRef<Set<string>>(new Set());

    const history = useBoardHistory();

    /* ---------- state commit helpers (ref đồng bộ tức thì) ---------- */

    const commitNodes = useCallback((next: BoardNode[]) => {
      nodesRef.current = next;
      setNodes(next);
    }, []);

    // Wheel events dồn dập giữa hai render — ref phải sync ngay, không chờ effect.
    const commitCamera = useCallback(
      (next: BoardCamera) => {
        cameraRef.current = next;
        setCamera(next);
        onCameraChange?.(next);
      },
      [onCameraChange],
    );

    const setTool = useCallback(
      (next: BoardTool) => {
        toolRef.current = next;
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
        void persist.patchNode(node.id, {
          layout: toStoredLayout(node),
          ...(extra?.noiDung !== undefined ? { noiDung: extra.noiDung } : {}),
        });
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

    const addSticky = useCallback(
      async (mau: string) => {
        if (lockedRef.current) return;
        const rect = rootRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        const cx = (rect?.width ?? 800) / 2 / cam.z - cam.x;
        const cy = (rect?.height ?? 600) / 2 / cam.z - cam.y;
        const isText = mau === TEXT_STICKY_MAU;
        const w = isText ? 260 : 240;
        const h = isText ? 80 : 200;
        const created = await persist.createNode({
          loai: "sticky",
          layout: { x: cx - w / 2, y: cy - h / 2, w, h, mau },
          noiDung: "",
        });
        if (created) {
          const node = { ...created, layout: { ...created.layout, mau } };
          addNodeInternal(node, true);
          // Mở edit ngay — khối mới sinh ra là để gõ chữ.
          setEditingId(node.id);
        }
      },
      [addNodeInternal, persist],
    );

    const addText = useCallback(
      () => addSticky(TEXT_STICKY_MAU),
      [addSticky],
    );

    const addShape = useCallback(
      async (mau: string, kind: BoardShapeKind = "rect") => {
        if (lockedRef.current) return;
        const rect = rootRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        const cx = (rect?.width ?? 800) / 2 / cam.z - cam.x;
        const cy = (rect?.height ?? 600) / 2 / cam.z - cam.y;
        const w = 160;
        const h = 160;
        const created = await persist.createNode({
          loai: "sticky",
          layout: {
            x: cx - w / 2,
            y: cy - h / 2,
            w,
            h,
            mau,
            shapeKind: kind,
          },
          noiDung: "",
        });
        if (created) {
          const node = {
            ...created,
            layout: { ...created.layout, mau, shapeKind: kind },
          };
          addNodeInternal(node, true);
          setEditingId(node.id);
        }
      },
      [addNodeInternal, persist],
    );

    const addTable = useCallback(
      async (rows = 3, cols = 3) => {
        if (lockedRef.current) return;
        const rect = rootRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        const cx = (rect?.width ?? 800) / 2 / cam.z - cam.x;
        const cy = (rect?.height ?? 600) / 2 / cam.z - cam.y;
        const table = createEmptyTable(rows, cols);
        const size = suggestTableSize(table);
        const created = await persist.createNode({
          loai: "sticky",
          layout: {
            x: cx - size.w / 2,
            y: cy - size.h / 2,
            w: size.w,
            h: size.h,
            contentKind: "table",
          },
          noiDung: serializeTable(table),
        });
        if (created) {
          const node = {
            ...created,
            layout: {
              ...created.layout,
              contentKind: "table" as const,
              w: size.w,
              h: size.h,
            },
            noiDung: created.noiDung ?? serializeTable(table),
          };
          addNodeInternal(node, true);
          setEditingId(node.id);
        }
      },
      [addNodeInternal, persist],
    );

    const addComment = useCallback(async () => {
      if (lockedRef.current) return;
      const rect = rootRef.current?.getBoundingClientRect();
      const cam = cameraRef.current;
      const cx = (rect?.width ?? 800) / 2 / cam.z - cam.x;
      const cy = (rect?.height ?? 600) / 2 / cam.z - cam.y;
      const w = BOARD_COMMENT_MIN_W + 40;
      const h = BOARD_COMMENT_MIN_H + 8;
      const created = await persist.createNode({
        loai: "sticky",
        layout: {
          x: cx - w / 2,
          y: cy - h / 2,
          w,
          h,
          contentKind: "comment",
        },
        noiDung: "",
      });
      if (created) {
        const node = {
          ...created,
          layout: {
            ...created.layout,
            contentKind: "comment" as const,
          },
        };
        addNodeInternal(node, true);
        setEditingId(node.id);
      }
    }, [addNodeInternal, persist]);

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
          return { ...n, layout: { ...n.layout, mau } };
        });
        commitNodes(next);
        const after = before.map((s) => {
          const n = next.find((x) => x.id === s.nodeId)!;
          return snapshotOf(n);
        });
        history.push({ type: "layout", before, after });
        for (const n of next) {
          if (!selectedRef.current.has(n.id)) continue;
          if (n.loai !== "sticky" && n.loai !== "frame") continue;
          if (normalizeContentKind(n.layout.contentKind) === "draw") {
            void persist.patchNode(n.id, {
              layout: n.layout,
              noiDung: n.noiDung ?? undefined,
            });
          } else {
            persistNodeLayout(n);
          }
        }
        emitSelection();
      },
      [commitNodes, emitSelection, history, persist, persistNodeLayout],
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
        for (const n of next) {
          if (targetIds.has(n.id)) persistNodeLayout(n);
        }
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistNodeLayout],
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
        for (const n of next) {
          if (targetIds.has(n.id)) persistNodeLayout(n);
        }
        emitSelection();
      },
      [commitNodes, emitSelection, history, persistNodeLayout],
    );

    const commitNodeText = useCallback(
      (
        nodeId: string,
        text: string,
        opts?: { keepEditing?: boolean },
      ) => {
        if (!opts?.keepEditing) setEditingId(null);
        const node = byId(nodeId);
        if (!node || lockedRef.current) return;
        if ((node.noiDung ?? "") === text) return;
        const before = [snapshotOf(node)];
        const updated = { ...node, noiDung: text };
        const after = [snapshotOf(updated)];
        commitNodes(
          nodesRef.current.map((n) => (n.id === nodeId ? updated : n)),
        );
        history.push({ type: "layout", before, after });
        persistNodeLayout(updated, { noiDung: text });
        emitSelection();
      },
      [byId, commitNodes, emitSelection, history, persistNodeLayout],
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

    /** Fit khung node ảnh theo tỉ lệ gốc (một lần, trừ khi đã imageFitted). */
    const fittingImageIdsRef = useRef(new Set<string>());
    const commentPersistTimersRef = useRef(new Map<string, number>());
    const fitImageNode = useCallback(
      (nodeId: string, naturalW: number, naturalH: number) => {
        const node = byId(nodeId);
        if (!node || node.loai !== "anh") return;
        if (node.layout.imageFitted) return;
        if (fittingImageIdsRef.current.has(nodeId)) return;
        fittingImageIdsRef.current.add(nodeId);

        const size = fitBoardImageSize(naturalW, naturalH);
        const cur = nodeRect(node);
        const aspectCur = cur.w / Math.max(1, cur.h);
        const aspectNat = size.w / Math.max(1, size.h);
        const aspectClose = Math.abs(aspectCur - aspectNat) < 0.03;
        const sizeClose =
          Math.abs(cur.w - size.w) <= 2 && Math.abs(cur.h - size.h) <= 2;

        if (aspectClose && sizeClose) {
          const marked = {
            ...node,
            layout: { ...node.layout, imageFitted: true },
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
            imageFitted: true,
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
      async (mau: string) => {
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

        const created = await persist.createNode({
          loai: "frame",
          layout: {
            x: minX - GROUP_PAD,
            y: minY - GROUP_PAD - GROUP_TITLE_H,
            w: maxX - minX + GROUP_PAD * 2,
            h: maxY - minY + GROUP_PAD * 2 + GROUP_TITLE_H,
            mau,
          },
          noiDung: `Nhóm ${cards.length}`,
        });
        if (!created) return;
        const frame: BoardNode = {
          ...created,
          layout: { ...created.layout, mau },
        };

        const before = cards.map(snapshotOf);
        const after = before.map((s) => ({
          ...s,
          layout: { ...s.layout, groupId: frame.id },
        }));

        const next = [
          frame,
          ...nodesRef.current.map((n) =>
            cardIds.has(n.id)
              ? { ...n, layout: { ...n.layout, groupId: frame.id } }
              : n,
          ),
        ];
        commitNodes(next);
        history.push({ type: "group", frame, before, after });
        for (const n of next) {
          if (cardIds.has(n.id)) persistNodeLayout(n);
        }
        setSelection(new Set([frame.id]));
        emitSelection();
      },
      [
        commitNodes,
        emitSelection,
        history,
        persist,
        persistNodeLayout,
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
      for (const snap of after) {
        const n = next.find((x) => x.id === snap.nodeId);
        if (n) persistNodeLayout(n);
      }
      setSelection(new Set());
      emitSelection();
    }, [
      commitNodes,
      emitSelection,
      history,
      membersOfFrame,
      persist,
      persistNodeLayout,
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

      // Connector giữ lại khi đủ 2 đầu from/to; node khác giữ nguyên.
      const usable = nodesProp.filter(
        (n) =>
          n.loai !== "connector" || Boolean(n.layout.from && n.layout.to),
      );
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
      setSelection,
      zoomToFit,
      zoomToNode,
    ]);

    /* ---------- pointer gestures ---------- */

    const startMove = useCallback(
      (e: ReactPointerEvent, nodeId: string) => {
        rootRef.current?.focus({ preventScroll: true });
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
        };
        setInteracting(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      },
      [byId, commitNodes, membersOfFrame, setSelection],
    );

    const startResize = useCallback(
      (e: ReactPointerEvent, nodeId: string, corner: Corner) => {
        const node = byId(nodeId);
        if (!node || lockedRef.current) return;
        e.stopPropagation();
        gestureRef.current = {
          type: "resize",
          pointerId: e.pointerId,
          startClient: { x: e.clientX, y: e.clientY },
          nodeId,
          corner,
          startRect: nodeRect(node),
          before: [snapshotOf(node)],
          moved: false,
        };
        setInteracting(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      },
      [byId],
    );

    const onRootPointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
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

        // Nền trống → marquee.
        const start = pageFromClient(e.clientX, e.clientY);
        gestureRef.current = {
          type: "marquee",
          pointerId: e.pointerId,
          startPage: start,
          additive: e.shiftKey,
          baseSelection: e.shiftKey ? new Set(selectedRef.current) : new Set(),
        };
        if (!e.shiftKey) setSelection(new Set());
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      },
      [pageFromClient, setSelection],
    );

    const onRootPointerMove = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
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
          const dx = (e.clientX - g.startClient.x) / cam.z;
          const dy = (e.clientY - g.startClient.y) / cam.z;
          const idSet = new Set(g.nodeIds);
          commitNodes(
            nodesRef.current.map((n) => {
              if (!idSet.has(n.id)) return n;
              const start = g.startPos.get(n.id);
              if (!start) return n;
              return {
                ...n,
                layout: { ...n.layout, x: start.x + dx, y: start.y + dy },
              };
            }),
          );
          return;
        }

        if (g.type === "wire") {
          const p = pageFromClient(e.clientX, e.clientY);
          setWireDraft((prev) =>
            prev ? { ...prev, x: p.x, y: p.y } : prev,
          );
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
          const endNode = endId ? byId(endId) : null;
          if (!endNode) return;
          const att = nearestEdgeAttachment(nodeRect(endNode), p);
          commitNodes(
            nodesRef.current.map((n) => {
              if (n.id !== g.wireId) return n;
              if (g.handle === "from") {
                return {
                  ...n,
                  layout: {
                    ...n.layout,
                    wireFromSide: att.side,
                    wireFromOffset: att.offset,
                  },
                };
              }
              return {
                ...n,
                layout: {
                  ...n.layout,
                  wireToSide: att.side,
                  wireToOffset: att.offset,
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
          commitNodes(
            nodesRef.current.map((n) =>
              n.id === g.nodeId
                ? {
                    ...n,
                    layout: { ...n.layout, x: r.x, y: r.y, w: r.w, h: r.h },
                  }
                : n,
            ),
          );
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
      [byId, commitCamera, commitNodes, pageFromClient, setSelection],
    );

    const finishGesture = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        const g = gestureRef.current;
        if (!g || g.pointerId !== e.pointerId) return;
        gestureRef.current = null;
        setPanning(false);
        setInteracting(false);
        setMarqueeRect(null);
        setWireDraft(null);
        setWireSnap(null);
        setDrawDraft(null);
        wirePathClickRef.current = null;

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
          // Thả lên node nào (trên cùng trước) → tạo connector tới node đó.
          const p = pageFromClient(e.clientX, e.clientY);
          const hit = hitNodeAt(nodesRef.current, p, g.fromId);
          if (hit) {
            const att = nearestEdgeAttachment(nodeRect(hit), p);
            void createWire(g.fromId, hit.id, {
              fromSide: g.fromSide,
              fromOffset: 0.5,
              toSide: att.side,
              toOffset: att.offset,
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
          // Thả vào / ra frame: xét card không phải frame đang kéo.
          const movingIds = new Set(g.nodeIds);
          const frames = nodesRef.current.filter(
            (n) => n.loai === "frame" && !movingIds.has(n.id),
          );
          const updates = new Map<string, string | null>();

          for (const id of g.nodeIds) {
            const n = byId(id);
            if (!n || n.loai === "frame") continue;
            const r = nodeRect(n);
            const cx = r.x + r.w / 2;
            const cy = r.y + r.h / 2;
            const host = [...frames].reverse().find((f) => {
              const fr = nodeRect(f);
              return (
                cx >= fr.x &&
                cx <= fr.x + fr.w &&
                cy >= fr.y &&
                cy <= fr.y + fr.h
              );
            });
            const nextGid = host ? host.id : null;
            if ((n.layout.groupId ?? null) !== nextGid) {
              updates.set(n.id, nextGid);
            }
          }

          let next = nodesRef.current;
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

          const after: BoardLayoutSnapshot[] = [];
          for (const id of g.nodeIds) {
            const n = next.find((x) => x.id === id);
            if (!n) continue;
            after.push(snapshotOf(n));
            persistNodeLayout(n);
          }
          history.push({ type: "layout", before: g.before, after });
          emitSelection();
          return;
        }

        if (g.type === "resize" && g.moved) {
          const n = byId(g.nodeId);
          if (n) {
            history.push({
              type: "layout",
              before: g.before,
              after: [snapshotOf(n)],
            });
            persistNodeLayout(n);
            emitSelection();
          }
        }
      },
      [
        addNodeInternal,
        byId,
        commitNodes,
        createWire,
        emitSelection,
        history,
        pageFromClient,
        persist,
        persistNodeLayout,
      ],
    );

    /* ---------- keyboard ---------- */

    const onKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (editingRef.current) return;
        if (e.key === " ") {
          spaceHeldRef.current = true;
          setSpaceHeld(true);
          e.preventDefault();
          return;
        }
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
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteSelection();
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
          if (toolRef.current === "draw") {
            setTool("select");
            return;
          }
          setSelection(new Set());
        }
      },
      [
        deleteSelection,
        redo,
        setSelection,
        setTool,
        undo,
        zoomIn,
        zoomOut,
        zoomReset,
      ],
    );

    const onKeyUp = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === " ") {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
      }
    }, []);

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
      const hasSticky = cards.some(
        (n) =>
          n.loai === "sticky" && !normalizeShapeKind(n.layout.shapeKind),
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

      const palette = selFrame ? GROUP_PALETTE : STICKY_PALETTE;
      const activeColor = selFrame
        ? (selFrame.layout.mau ?? GROUP_PALETTE[0])
        : cards.find((n) => n.loai === "sticky")?.layout.mau;
      const customActive =
        Boolean(activeColor) &&
        !isPresetPaletteColor(activeColor, palette);

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
          {selFrame || hasSticky || hasShape ? (
            <div
              className="cins-canvas-palette"
              role="group"
              aria-label={
                selFrame
                  ? "Màu nền nhóm"
                  : hasShape && !hasSticky
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
              <CustomColorSwatch
                value={activeColor ?? (selFrame ? "#1f74c9" : STICKY_PALETTE[0]!)}
                isActive={customActive}
                ariaLabel={
                  selFrame ? "Màu nhóm tùy chọn" : "Màu tùy chọn"
                }
                onPick={(hex) =>
                  applyColorToSelection(
                    selFrame ? hexToGroupTint(hex) : hex,
                  )
                }
              />
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
          {canGroup ? (
            <button
              type="button"
              className="cins-canvas-tool-btn"
              onClick={() => void groupSelection(GROUP_PALETTE[0]!)}
              title="Gom các mục đã chọn thành một nhóm"
            >
              <Group size={14} strokeWidth={1.9} aria-hidden />
              Nhóm
            </button>
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
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaste={onPaste}
      >
        <BoardDotGrid camera={camera} />
        {nodesProp !== null && nodes.length === 0 ? (
          <div className="cins-board-empty" aria-hidden>
            <p>Canvas trống — bắt đầu bằng cách:</p>
            <ul>
              <li>Bấm icon ghi chú / chữ / hình / bảng trên thanh công cụ</li>
              <li>Chọn bút vẽ (D) rồi kéo trên nền trống để vẽ tự do</li>
              <li>Kéo ảnh từ máy vào đây, hoặc dán ảnh (Ctrl+V)</li>
              <li>Trong tin nhắn có ảnh/link: menu ⋯ → «Thêm vào canvas»</li>
              <li>«Đồng bộ» để gom ảnh/link đã gửi trong phòng</li>
            </ul>
          </div>
        ) : null}
        <div
          className="cins-board-world"
          style={{
            transform: `scale(${camera.z}) translate(${camera.x}px, ${camera.y}px)`,
          }}
        >
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
              const a = nodes.find((x) => x.id === w.layout.from);
              const b = nodes.find((x) => x.id === w.layout.to);
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
              const guidePts = [
                path.from,
                ...(path.anchors.length > 0
                  ? path.anchors
                  : [{ x: path.mid.x, y: path.mid.y }]),
                path.to,
              ];
              const showLegacyMid =
                selected && !locked && path.anchors.length === 0;
              return (
                <g
                  key={w.id}
                  className={
                    "cins-board-wire" + (selected ? " is-selected" : "")
                  }
                  onPointerDown={(e) => {
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
                      {guidePts.slice(0, -1).map((pt, i) => {
                        const next = guidePts[i + 1]!;
                        return (
                          <line
                            key={`g-${i}`}
                            className="cins-board-wire-guide"
                            x1={pt.x}
                            y1={pt.y}
                            x2={next.x}
                            y2={next.y}
                          />
                        );
                      })}
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
                  const from = nodes.find((x) => x.id === wireDraft.fromId);
                  if (!from) return null;
                  const hover = hitNodeAt(
                    nodes,
                    { x: wireDraft.x, y: wireDraft.y },
                    wireDraft.fromId,
                  );
                  const draftOpts = {
                    fromSide: wireDraft.fromSide,
                    fromOffset: 0.5,
                  };
                  return (
                    <path
                      className="cins-board-wire-draft"
                      d={wirePathDraft(
                        nodeRect(from),
                        { x: wireDraft.x, y: wireDraft.y },
                        hover ? nodeRect(hover) : null,
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
                className={
                  `cins-board-node cins-canvas-shape cins-canvas-shape--${node.loai}` +
                  (selected ? " is-selected" : "") +
                  (highlightIds.has(node.id) ? " is-highlight" : "") +
                  (isComment ? " is-comment" : "")
                }
                style={{
                  transform: `translate(${r.x}px, ${r.y}px)`,
                  width: r.w,
                  height: r.h,
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0 || spaceHeldRef.current) return;
                  // Tool bàn tay: node không nuốt event — root pan.
                  if (toolRef.current === "pan") return;
                  // Tool vẽ: nền trống mới vẽ — click node vẫn chọn/kéo.
                  if (toolRef.current === "draw") {
                    e.stopPropagation();
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
                  onCancelEdit={() => setEditingId(null)}
                  onRequestEdit={(id) => {
                    setSelection(new Set([id]));
                    setEditingId(id);
                  }}
                  onImageNaturalSize={fitImageNode}
                  onCommentSize={fitCommentNode}
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
              className="cins-board-marquee"
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
