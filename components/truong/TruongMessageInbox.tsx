"use client";

import { useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  formatInboxTime,
  inboxStatusLabel,
  MOCK_INBOX_THREADS,
  type InboxThread,
  type InboxThreadStatus,
} from "@/lib/truong/message-inbox-mock";

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

type FilterKey = "all" | InboxThreadStatus | "unread";

export function TruongMessageInbox() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState(MOCK_INBOX_THREADS);
  const [selectedId, setSelectedId] = useState<string | null>(
    MOCK_INBOX_THREADS[0]?.id ?? null,
  );
  const [filter, setFilter] = useState<FilterKey>("unread");
  const [reply, setReply] = useState("");

  const unreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return threads;
    if (filter === "unread") return threads.filter((t) => t.unread);
    return threads.filter((t) => t.status === filter);
  }, [threads, filter]);

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId],
  );

  if (!ctx?.canEdit || !ctx.isEditing) return null;

  function openInbox() {
    setOpen(true);
    if (!selectedId && threads[0]) setSelectedId(threads[0].id);
  }

  function sendReply() {
    const text = reply.trim();
    if (!text || !selected) return;

    const now = new Date().toISOString();
    const newMsg = {
      id: `reply-${Date.now()}`,
      from: "school" as const,
      body: text,
      sentAt: now,
    };

    setThreads((list) =>
      list.map((t) =>
        t.id === selected.id
          ? {
              ...t,
              unread: false,
              status: "replied" as const,
              messages: [...t.messages, newMsg],
              preview: text.slice(0, 80),
            }
          : t,
      ),
    );
    setReply("");
    ctx?.showToast("Đã gửi trả lời (mock)");
  }

  function markArchived() {
    if (!selected) return;
    setThreads((list) =>
      list.map((t) =>
        t.id === selected.id
          ? { ...t, status: "archived" as const, unread: false }
          : t,
      ),
    );
    ctx?.showToast("Đã lưu trữ hội thoại (mock)");
  }

  return (
    <>
      <button
        type="button"
        className="ss-btn ghost ss-btn-messages"
        onClick={openInbox}
        aria-label={
          unreadCount > 0
            ? `Tin nhắn — ${unreadCount} chưa đọc`
            : "Tin nhắn"
        }
      >
        <ChatIcon />
        <span className="ss-btn-messages-label">Tin nhắn</span>
        {unreadCount > 0 ? (
          <span className="ss-btn-messages-badge" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide tdh-message-inbox-modal"
        labelledBy="tdh-message-inbox-title"
      >
        <div className="tdh-message-inbox-hdr">
          <div>
            <h3 id="tdh-message-inbox-title" className="tdh-inline-modal-title">
              Tin nhắn tuyển sinh
            </h3>
            <p className="tdh-message-inbox-lead">
              Hội thoại từ user hỏi <strong>{ctx.school.ten}</strong> — chọn hội
              thoại để xem và trả lời. (Mock)
            </p>
          </div>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setOpen(false)}
          >
            Đóng
          </button>
        </div>

        <div className="tdh-message-inbox-layout">
          <aside className="tdh-message-inbox-list-pane">
            <div
              className="tdh-message-inbox-filters"
              role="tablist"
              aria-label="Lọc hội thoại"
            >
              {(
                [
                  ["unread", "Chưa đọc", unreadCount],
                  ["open", "Chưa trả lời", threads.filter((t) => t.status === "open").length],
                  ["all", "Tất cả", threads.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={`tdh-message-inbox-filter${filter === key ? " on" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span className="tdh-message-inbox-filter-count">{count}</span>
                </button>
              ))}
            </div>

            <ul className="tdh-message-inbox-thread-list">
              {filtered.length === 0 ? (
                <li className="tdh-message-inbox-thread-empty">
                  Không có hội thoại.
                </li>
              ) : (
                filtered.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    active={thread.id === selectedId}
                    onSelect={() => {
                      setSelectedId(thread.id);
                      setThreads((list) =>
                        list.map((t) =>
                          t.id === thread.id ? { ...t, unread: false } : t,
                        ),
                      );
                    }}
                  />
                ))
              )}
            </ul>
          </aside>

          <section
            className="tdh-message-inbox-detail-pane"
            aria-label="Chi tiết hội thoại"
          >
            {selected ? (
              <ThreadDetail
                thread={selected}
                reply={reply}
                onReplyChange={setReply}
                onSend={() => void sendReply()}
                onArchive={markArchived}
              />
            ) : (
              <p className="tdh-message-inbox-pick">
                Chọn một hội thoại bên trái để đọc và trả lời.
              </p>
            )}
          </section>
        </div>
      </TruongInlineModal>
    </>
  );
}

function ThreadListItem({
  thread,
  active,
  onSelect,
}: {
  thread: InboxThread;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`tdh-message-inbox-thread${active ? " is-active" : ""}${thread.unread ? " is-unread" : ""}`}
        onClick={onSelect}
      >
        <span className="tdh-message-inbox-thread-avatar" aria-hidden>
          {studentInitials(thread.userName)}
        </span>
        <span className="tdh-message-inbox-thread-body">
          <span className="tdh-message-inbox-thread-top">
            <span className="tdh-message-inbox-thread-name">{thread.userName}</span>
            <time className="tdh-message-inbox-thread-time">
              {formatInboxTime(thread.taggedAt)}
            </time>
          </span>
          <span className="tdh-message-inbox-thread-subject">{thread.subject}</span>
          <span className="tdh-message-inbox-thread-preview">{thread.preview}</span>
        </span>
        {thread.unread ? (
          <span className="tdh-message-inbox-thread-dot" aria-hidden />
        ) : null}
      </button>
    </li>
  );
}

function ThreadDetail({
  thread,
  reply,
  onReplyChange,
  onSend,
  onArchive,
}: {
  thread: InboxThread;
  reply: string;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  onArchive: () => void;
}) {
  return (
    <>
      <header className="tdh-message-inbox-detail-hdr">
        <div>
          <h4 className="tdh-message-inbox-detail-title">{thread.subject}</h4>
          <p className="tdh-message-inbox-detail-meta">
            {thread.userName} · {thread.userRole} ·{" "}
            <span
              className={`tdh-message-inbox-status tdh-message-inbox-status--${thread.status}`}
            >
              {inboxStatusLabel(thread.status)}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="tdh-inline-btn ghost tdh-message-inbox-archive-btn"
          onClick={onArchive}
        >
          Lưu trữ
        </button>
      </header>

      <ul className="tdh-message-inbox-messages">
        {thread.messages.map((msg) => (
          <li
            key={msg.id}
            className={`tdh-message-inbox-bubble tdh-message-inbox-bubble--${msg.from}`}
          >
            <p className="tdh-message-inbox-bubble-text">{msg.body}</p>
            <time className="tdh-message-inbox-bubble-time">
              {formatInboxTime(msg.sentAt)}
              {msg.from === "school" ? " · Trường" : " · User"}
            </time>
          </li>
        ))}
      </ul>

      <div className="tdh-message-inbox-compose">
        <textarea
          id="tdh-inbox-reply"
          className="tdh-message-inbox-textarea"
          rows={2}
          placeholder="Trả lời sinh viên / phụ huynh…"
          value={reply}
          onChange={(e) => onReplyChange(e.target.value)}
          aria-label="Trả lời"
        />
        <button
          type="button"
          className="tdh-inline-btn primary tdh-message-inbox-send"
          disabled={!reply.trim()}
          onClick={onSend}
        >
          Gửi
        </button>
      </div>
    </>
  );
}
