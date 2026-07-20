/** Cầu nối giữa board canvas (CinsBoard) và overlay chat. */

import type { ChatCanvasNode } from "@/lib/chat/canvas/types";
import type { ChatMessage } from "@/lib/chat/types";

export type JumpToMessageFn = (messageId: string) => void;
export type IngestCanvasNodeFn = (node: ChatCanvasNode) => void;
export type IngestCommentNoticeFn = (message: ChatMessage) => void;

/**
 * Ref cấp module — board set khi mount, shape component gọi khi bấm "mở tin".
 * Mỗi thời điểm chỉ một board mở nên một ref là đủ.
 */
export const canvasBridge: {
  jumpToMessage: JumpToMessageFn | null;
  ingestNode: IngestCanvasNodeFn | null;
  /** Node vừa thêm từ menu tin — board zoom tới sau khi hydrate. */
  pendingFocusNodeId: string | null;
  /** Node bình luận cần highlight khi mở canvas từ tin feed. */
  pendingHighlightNodeIds: string[] | null;
  /** Board đang mở — highlight ngay (không chờ remount). */
  highlightNodes: ((nodeIds: string[]) => void) | null;
  /** Tin «vừa có bình luận» — inject vào feed khi tạo comment. */
  ingestCommentNotice: IngestCommentNoticeFn | null;
} = {
  jumpToMessage: null,
  ingestNode: null,
  pendingFocusNodeId: null,
  pendingHighlightNodeIds: null,
  highlightNodes: null,
  ingestCommentNotice: null,
};
