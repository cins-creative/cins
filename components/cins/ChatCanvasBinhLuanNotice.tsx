"use client";

import { MessageCircle } from "lucide-react";

import type { ChatCanvasBinhLuanNotice } from "@/lib/chat/types";

function noticeCopy(notice: ChatCanvasBinhLuanNotice) {
  const name = notice.tenNguoi;
  if (notice.isReply && notice.hostTen) {
    const action =
      notice.soLuong <= 1
        ? `đã trả lời bình luận của ${notice.hostTen}`
        : `đã trả lời ${notice.soLuong} lần bình luận của ${notice.hostTen}`;
    return { name, action };
  }
  const count =
    notice.soLuong <= 1 ? "một bình luận" : `${notice.soLuong} bình luận`;
  return { name, action: `vừa có ${count}` };
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
  const { name, action } = noticeCopy(notice);

  return (
    <button
      type="button"
      className="cins-chat-canvas-comment-notice"
      onClick={() => onOpen?.(notice.nodeIds, messageId)}
    >
      <span className="cins-chat-canvas-comment-notice-icon" aria-hidden>
        <MessageCircle size={14} strokeWidth={2} />
      </span>
      <span className="cins-chat-canvas-comment-notice-copy">
        {name ? (
          <>
            <strong>{name}</strong>
            {" "}
            {action}
            {" trong Canvas"}
          </>
        ) : (
          fallbackBody || "Bình luận trên Canvas"
        )}
      </span>
    </button>
  );
}
