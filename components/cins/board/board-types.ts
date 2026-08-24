/**
 * Board engine CINs — types dùng chung (không phụ thuộc chat).
 *
 * Engine render node HTML tuyệt đối trên một world layer có camera
 * translate/scale; dữ liệu node dùng đúng shape `ChatCanvasNode`
 * (id / loai / url / noiDung / messageId / layout) nên adapter chat
 * truyền thẳng, adapter khác chỉ cần map về cùng dạng.
 *
 * Quy ước tọa độ: trong bộ nhớ engine mọi node giữ tọa độ TUYỆT ĐỐI
 * (page units). Khi lưu, node thuộc group lưu tọa độ TƯƠNG ĐỐI so với
 * frame (giữ tương thích dữ liệu tldraw cũ) — engine tự quy đổi 2 chiều.
 */

import type {
  CanvasNodeLayout,
  CanvasNodeLoai,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import {
  CANVAS_LINK_INFO_H,
  fitCanvasVideoLinkSize,
} from "@/lib/chat/canvas/video-layout";

/** Node trên board — alias theo node canvas hiện có. */
export type BoardNode = ChatCanvasNode;

/** Công cụ đang cầm: chọn/kéo, bàn tay, vẽ, hoặc đặt block theo click. */
export type BoardPlaceTool = "text" | "sticky" | "shape" | "table" | "comment";
export type BoardTool = "select" | "pan" | "draw" | BoardPlaceTool;

export const BOARD_PLACE_TOOLS: readonly BoardPlaceTool[] = [
  "text",
  "sticky",
  "shape",
  "table",
  "comment",
];

export function isBoardPlaceTool(tool: BoardTool): tool is BoardPlaceTool {
  return (BOARD_PLACE_TOOLS as readonly string[]).includes(tool);
}

export type BoardPlaceOpts = {
  mau?: string;
  shapeKind?: "rect" | "ellipse" | "diamond";
  rows?: number;
  cols?: number;
};

/** Camera: screen = (page + {x,y}) * z (cùng quy ước tldraw cũ). */
export type BoardCamera = { x: number; y: number; z: number };

export const BOARD_MIN_ZOOM = 0.05;
export const BOARD_MAX_ZOOM = 4;

export const BOARD_DEFAULT_NODE_W = 240;
export const BOARD_DEFAULT_NODE_H = 200;
export const BOARD_MIN_NODE_SIZE = 60;

/** Bubble bình luận trên canvas — dãn theo chữ. */
export const BOARD_COMMENT_MIN_W = 132;
export const BOARD_COMMENT_MAX_W = 320;
/** Ô nhập trong bubble: trừ avatar + padding + nút gửi. */
export const BOARD_COMMENT_COMPOSE_MIN_W = 48;
export const BOARD_COMMENT_COMPOSE_MAX_W = 228;
export const BOARD_COMMENT_MIN_H = 48;
export const BOARD_COMMENT_REPLY_INDENT = 22;
export const BOARD_COMMENT_STACK_GAP = 8;

/** Kích thước tối đa khi dán/kéo ảnh lên board (giữ tỉ lệ gốc). */
export const BOARD_IMAGE_MAX_W = 360;
export const BOARD_IMAGE_MAX_H = 360;

/** Chiều cao footer title card link (padding + 1 dòng "Video"). */
export const BOARD_LINK_INFO_H = CANVAS_LINK_INFO_H;

/** Fit ảnh vào khung tối đa, giữ tỉ lệ — không crop. */
export function fitBoardImageSize(
  naturalW: number,
  naturalH: number,
  maxW = BOARD_IMAGE_MAX_W,
  maxH = BOARD_IMAGE_MAX_H,
): { w: number; h: number } {
  const nw = Math.max(1, naturalW);
  const nh = Math.max(1, naturalH);
  const scale = Math.min(maxW / nw, maxH / nh, 1);
  return {
    w: Math.max(BOARD_MIN_NODE_SIZE, Math.round(nw * scale)),
    h: Math.max(BOARD_MIN_NODE_SIZE, Math.round(nh * scale)),
  };
}

/** Fit video file card: khung media theo tỉ lệ + footer info. */
export function fitBoardLinkVideoSize(
  naturalW: number,
  naturalH: number,
): { w: number; h: number } {
  return fitCanvasVideoLinkSize(naturalW, naturalH);
}

/** Patch gửi về server cho một node. */
export type BoardNodePatch = {
  layout: CanvasNodeLayout;
  noiDung?: string;
};

export type BoardCreateNodeInput = {
  loai: CanvasNodeLoai;
  layout: CanvasNodeLayout;
  noiDung?: string | null;
  url?: string | null;
  messageId?: string | null;
};

/**
 * Adapter persist — engine gọi, không biết endpoint cụ thể.
 * `recreateNode` phục vụ undo lệnh xóa: server tạo node mới (id mới),
 * engine tự remap id trong history.
 */
export type BoardLayoutBatchPatch = {
  nodeId: string;
  layout: CanvasNodeLayout;
};

export type BoardPersistAdapter = {
  createNode: (input: BoardCreateNodeInput) => Promise<BoardNode | null>;
  patchNode: (nodeId: string, patch: BoardNodePatch) => Promise<void>;
  /** Cập nhật layout nhiều node — một request (auto layout). */
  patchNodesLayoutBatch?: (
    patches: BoardLayoutBatchPatch[],
  ) => Promise<void>;
  /** Xóa node (hoặc ẩn node message-backed — tùy adapter quyết). */
  deleteNode: (node: BoardNode) => Promise<void>;
  /** Tạo lại node đã xóa (undo) — trả node mới hoặc null nếu thất bại. */
  recreateNode: (node: BoardNode) => Promise<BoardNode | null>;
};

/** API imperative của engine — wrapper (toolbar) điều khiển qua ref. */
export type BoardHandle = {
  /** Thêm node đã được server tạo; select + zoom tới node; ghi history. */
  addNode: (node: BoardNode) => void;
  /** Node đã có thì select+zoom, chưa có thì thêm (không ghi history). */
  ingestNode: (node: BoardNode) => void;
  /** Thêm sticky — không truyền page thì tâm viewport. */
  addSticky: (mau: string, page?: { x: number; y: number }) => void;
  /** Thêm khối chữ (sticky nền trong suốt). */
  addText: () => void;
  /** Thêm hình học (rect / ellipse / diamond). */
  addShape: (
    mau: string,
    kind?: "rect" | "ellipse" | "diamond",
    page?: { x: number; y: number },
  ) => void;
  /** Thêm bảng ô. */
  addTable: (rows?: number, cols?: number, page?: { x: number; y: number }) => void;
  /** Thêm bình luận (avatar + tên + chữ). */
  addComment: (page?: { x: number; y: number }) => void;
  /** Highlight các node (từ tin «vừa có bình luận»). */
  highlightNodes: (nodeIds: string[]) => void;
  /** Đổi màu sticky/frame đang chọn. */
  applyColorToSelection: (mau: string) => void;
  /** Đổi tên frame đang chọn. */
  renameSelectedFrame: (name: string) => void;
  /** Gom các card đang chọn thành nhóm mới. */
  groupSelection: (mau: string) => void;
  /** Tách frame đang chọn — giữ các card con. */
  ungroupSelection: () => Promise<void>;
  /** Xóa các node đang chọn (undo được). */
  deleteSelection: () => void;
  /** Xóa toàn bộ block trên board (không undo — caller phải confirm trước). */
  clearBoard: () => void;
  /** Đổi công cụ chọn / bàn tay / vẽ / đặt block. */
  setTool: (tool: BoardTool, opts?: BoardPlaceOpts) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Về zoom 100% giữ tâm viewport. */
  zoomReset: () => void;
  zoomToFit: () => void;
  /** Xếp lại toàn board thành lưới gọn (undo được). */
  autoLayout: () => void;
  undo: () => void;
  redo: () => void;
};

/** Selection tóm tắt cho toolbar. */
export type BoardSelectionSummary = {
  /** Tổng số node đang chọn (card + frame) — bật/tắt nút Xóa. */
  selectedCount: number;
  /** Số card (không phải frame) đang chọn. */
  cardCount: number;
  /** Frame duy nhất đang chọn (nếu có). */
  frame: { nodeId: string; name: string; mau: string } | null;
  /** Có sticky trong selection — palette đổi màu tác động được. */
  hasSticky: boolean;
  /** Tổng số node trên board (để bật/tắt Clear). */
  nodeCount: number;
  canUndo: boolean;
  canRedo: boolean;
};

/** Vùng bao của một node (page units, tọa độ tuyệt đối trong engine). */
export function nodeRect(node: BoardNode): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: node.layout.x,
    y: node.layout.y,
    w: node.layout.w ?? BOARD_DEFAULT_NODE_W,
    h: node.layout.h ?? BOARD_DEFAULT_NODE_H,
  };
}
