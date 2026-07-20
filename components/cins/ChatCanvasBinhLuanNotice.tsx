"use client";

import type { ChatCanvasBinhLuanNotice } from "@/lib/chat/types";

function noticeLabel(notice: ChatCanvasBinhLuanNotice): string {
  if (notice.soLuong <= 1) {
    return `${notice.tenNguoi} vừa có một bình luận`;
  }
  return `${notice.tenNguoi} vừa có ${notice.soLuong} bình luận`;
}

export function ChatCanvasBinhLuanNoticeBubble({
  notice,
  messageId,
  fallbackBody,
  onOpen,
}: {
  notice: ChatCanvasBinhLuanNotice;
  messageId: string;
  fallbackBody?: string;
  onOpen?: (nodeIds: string[], messageId: string) => void;
}) {
  const label = noticeLabel(notice) || fallbackBody || "Bình luận trên canvas";

  return (
    <button
      type="button"
      className="cins-chat-canvas-comment-notice"
      onClick={() => onOpen?.(notice.nodeIds, messageId)}
    >
      {label}
    </button>
  );
}
