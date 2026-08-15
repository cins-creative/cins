"use client";

import {
  AlarmClock,
  BellRing,
  CalendarPlus,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import type { ChatMocNotice } from "@/lib/chat/types";

const MOC_NOTICE_META: Record<
  ChatMocNotice["suKien"],
  { label: string; Icon: LucideIcon }
> = {
  tao: { label: "Mốc mới", Icon: CalendarPlus },
  nhac_truoc: { label: "Nhắc nhở", Icon: BellRing },
  den_han: { label: "Đến hạn", Icon: AlarmClock },
};

function splitNoticeWhen(iso: string): {
  day: string;
  month: string;
  time: string;
  valid: boolean;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { day: "", month: "", time: iso, valid: false };
  }
  return {
    day: d.toLocaleDateString("vi-VN", { day: "2-digit" }),
    month: d.toLocaleDateString("vi-VN", { month: "short" }).replace(".", "").toUpperCase(),
    time: d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    valid: true,
  };
}

function formatNoticeLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return host || "Mở liên kết";
  } catch {
    return "Mở liên kết";
  }
}

export function ChatMocNoticeBubble({
  notice,
  fallbackBody,
}: {
  notice: ChatMocNotice;
  fallbackBody?: string;
}) {
  const meta = MOC_NOTICE_META[notice.suKien];
  const Icon = meta.Icon;
  const when = splitNoticeWhen(notice.thoiDiem);

  return (
    <div
      className={`cins-chat-moc-notice is-${notice.suKien}`}
      role="status"
    >
      <div className="cins-chat-moc-notice-sheet">
        <header className="cins-chat-moc-notice-head">
          <span className="cins-chat-moc-notice-kind">
            <span className="cins-chat-moc-notice-icon" aria-hidden>
              <Icon size={13} strokeWidth={2.25} />
            </span>
            {meta.label}
          </span>
          <time dateTime={notice.thoiDiem}>{when.time}</time>
        </header>

        <div className="cins-chat-moc-notice-body">
          {when.valid ? (
            <div className="cins-chat-moc-notice-date" aria-hidden>
              <span className="cins-chat-moc-notice-date-cap" />
              <span className="cins-chat-moc-notice-day">{when.day}</span>
              <span className="cins-chat-moc-notice-month">{when.month}</span>
            </div>
          ) : null}

          <div className="cins-chat-moc-notice-copy">
            <strong className="cins-chat-moc-notice-title">{notice.ten}</strong>
            {notice.moTa ? (
              <p className="cins-chat-moc-notice-desc">{notice.moTa}</p>
            ) : null}
            {!notice.moTa && !notice.url && fallbackBody ? (
              <p className="cins-chat-moc-notice-fallback">{fallbackBody}</p>
            ) : null}
          </div>
        </div>

        {notice.url ? (
          <a
            className="cins-chat-moc-notice-link"
            href={notice.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>{formatNoticeLinkLabel(notice.url)}</span>
            <ExternalLink size={13} strokeWidth={2.1} aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
