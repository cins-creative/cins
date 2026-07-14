"use client";

import type { ChatMocNotice } from "@/lib/chat/types";

const SU_KIEN_LABEL: Record<ChatMocNotice["suKien"], string> = {
  tao: "Mốc mới",
  nhac_truoc: "Nhắc nhở",
  den_han: "Đến hạn",
};

function formatNoticeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ChatMocNoticeBubble({
  notice,
  fallbackBody,
}: {
  notice: ChatMocNotice;
  fallbackBody?: string;
}) {
  return (
    <div className={`cins-chat-moc-notice is-${notice.suKien}`}>
      <span className="cins-chat-moc-notice-kind">
        {SU_KIEN_LABEL[notice.suKien]}
      </span>
      <strong className="cins-chat-moc-notice-title">{notice.ten}</strong>
      <time dateTime={notice.thoiDiem}>{formatNoticeTime(notice.thoiDiem)}</time>
      {notice.moTa ? <p>{notice.moTa}</p> : null}
      {notice.url ? (
        <a href={notice.url} target="_blank" rel="noreferrer">
          {notice.url}
        </a>
      ) : null}
      {!notice.moTa && !notice.url && fallbackBody ? (
        <p className="cins-chat-moc-notice-fallback">{fallbackBody}</p>
      ) : null}
    </div>
  );
}
