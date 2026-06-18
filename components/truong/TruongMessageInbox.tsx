"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import type { OrgInboxThread, OrgInboxThreadStatus } from "@/lib/chat/org-inbox-types";
import type { ChatMessage } from "@/lib/chat/types";
import { formatInboxTime } from "@/lib/truong/message-inbox-mock";

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

function inboxStatusLabel(status: OrgInboxThreadStatus): string {
  return status === "open" ? "Chưa trả lời" : "Đã trả lời";
}

type FilterKey = "all" | OrgInboxThreadStatus | "unread";

export function TruongMessageInbox() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<OrgInboxThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("open");
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

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
    () => threads.find((t) => t.studentUserId === selectedStudentId) ?? null,
    [threads, selectedStudentId],
  );

  const loadThreads = useCallback(async () => {
    if (!ctx?.orgId) return;
    setLoadingThreads(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/org/${ctx.orgId}/inbox/threads`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        threads?: OrgInboxThread[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(json.error ?? "Không tải được hộp thư.");
        setThreads([]);
        return;
      }
      const next = Array.isArray(json.threads) ? json.threads : [];
      setThreads(next);
      setSelectedStudentId((current) => {
        if (current && next.some((t) => t.studentUserId === current)) return current;
        return (
          next.find((t) => t.status === "open")?.studentUserId ??
          next[0]?.studentUserId ??
          null
        );
      });
    } catch {
      setLoadError("Lỗi mạng.");
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [ctx?.orgId]);

  const loadMessages = useCallback(
    async (studentUserId: string) => {
      if (!ctx?.orgId) return;
      setLoadingMessages(true);
      setMessageError(null);
      try {
        const res = await fetch(
          `/api/org/${ctx.orgId}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };
        if (!res.ok) {
          setMessageError(json.error ?? "Không tải được tin nhắn.");
          setMessages([]);
          return;
        }
        setMessages(Array.isArray(json.messages) ? json.messages : []);
        setThreads((list) =>
          list.map((thread) =>
            thread.studentUserId === studentUserId
              ? { ...thread, unread: false, unreadCount: 0 }
              : thread,
          ),
        );
      } catch {
        setMessageError("Lỗi mạng.");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [ctx?.orgId],
  );

  useEffect(() => {
    if (open) {
      setFilter("open");
      void loadThreads();
    } else {
      setSelectedStudentId(null);
      setMessages([]);
      setReply("");
    }
  }, [open, loadThreads]);

  useEffect(() => {
    if (!open || !selectedStudentId) return;
    void loadMessages(selectedStudentId);
  }, [open, selectedStudentId, loadMessages]);

  if (!ctx?.canEdit || !ctx.isEditing) return null;

  function selectThread(studentUserId: string) {
    setSelectedStudentId(studentUserId);
    setReply("");
  }

  function sendReply() {
    const text = reply.trim();
    if (!text || !selected || !ctx?.orgId || pending) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/org/${ctx.orgId}/student-chat/${encodeURIComponent(selected.studentUserId)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noi_dung: text }),
          },
        );
        const json = (await res.json()) as {
          message?: ChatMessage;
          error?: string;
        };
        if (!res.ok || !json.message) {
          ctx.showToast(json.error ?? "Không gửi được tin nhắn.");
          return;
        }
        setReply("");
        setMessages((prev) => [...prev, json.message!]);
        setThreads((list) =>
          list.map((thread) =>
            thread.studentUserId === selected.studentUserId
              ? {
                  ...thread,
                  unread: false,
                  unreadCount: 0,
                  status: "replied" as const,
                  preview: text.slice(0, 80),
                  lastAt: json.message!.sentAt,
                }
              : thread,
          ),
        );
        ctx.showToast("Đã gửi tin nhắn");
      } catch {
        ctx.showToast("Lỗi mạng.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="ss-btn ghost ss-btn-messages"
        onClick={() => setOpen(true)}
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
              Hội thoại user nhắn <strong>{ctx.school.ten}</strong> — đồng bộ với
              tab <strong>Tổ chức</strong> trên CINs Chat.
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
                  [
                    "open",
                    "Chưa trả lời",
                    threads.filter((t) => t.status === "open").length,
                  ],
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
              {loadingThreads ? (
                <li className="tdh-message-inbox-thread-empty">Đang tải…</li>
              ) : loadError ? (
                <li className="tdh-message-inbox-thread-empty">{loadError}</li>
              ) : filtered.length === 0 ? (
                <li className="tdh-message-inbox-thread-empty">
                  Không có hội thoại.
                </li>
              ) : (
                filtered.map((thread) => (
                  <ThreadListItem
                    key={thread.studentUserId}
                    thread={thread}
                    active={thread.studentUserId === selectedStudentId}
                    onSelect={() => selectThread(thread.studentUserId)}
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
                messages={messages}
                loading={loadingMessages}
                error={messageError}
                reply={reply}
                sending={pending}
                onReplyChange={setReply}
                onSend={() => void sendReply()}
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
  thread: OrgInboxThread;
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
          {thread.studentAvatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={thread.studentAvatarUrl} alt="" />
          ) : (
            studentInitials(thread.studentName)
          )}
        </span>
        <span className="tdh-message-inbox-thread-body">
          <span className="tdh-message-inbox-thread-top">
            <span className="tdh-message-inbox-thread-id">
              <span className="tdh-message-inbox-thread-name">{thread.studentName}</span>
              <span className="tdh-message-inbox-thread-role">
                {thread.studentContactLabel}
              </span>
            </span>
            <time className="tdh-message-inbox-thread-time" dateTime={thread.lastAt}>
              {formatInboxTime(thread.lastAt)}
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
  messages,
  loading,
  error,
  reply,
  sending,
  onReplyChange,
  onSend,
}: {
  thread: OrgInboxThread;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  reply: string;
  sending: boolean;
  onReplyChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <header className="tdh-message-inbox-detail-hdr">
        <div>
          <h4 className="tdh-message-inbox-detail-title">{thread.subject}</h4>
          <p className="tdh-message-inbox-detail-meta">
            {thread.studentName} · {thread.studentContactLabel}
            {thread.studentRole &&
            thread.studentRole !== thread.studentContactLabel ? (
              <> · {thread.studentRole}</>
            ) : null}{" "}
            ·{" "}
            <span
              className={`tdh-message-inbox-status tdh-message-inbox-status--${thread.status}`}
            >
              {inboxStatusLabel(thread.status)}
            </span>
          </p>
        </div>
      </header>

      {loading ? (
        <p className="tdh-message-inbox-pick">
          <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" aria-hidden />
          Đang tải tin nhắn…
        </p>
      ) : error ? (
        <p className="tdh-message-inbox-pick">{error}</p>
      ) : (
        <div className="tdh-message-inbox-messages cins-chat-messages">
          {messages.length === 0 ? (
            <p className="tdh-message-inbox-thread-empty">Chưa có tin nhắn.</p>
          ) : (
            <ChatMessageThreadItems messages={messages} />
          )}
        </div>
      )}

      <div className="tdh-message-inbox-compose">
        <textarea
          id="tdh-inbox-reply"
          className="tdh-message-inbox-textarea"
          rows={2}
          placeholder="Trả lời sinh viên / phụ huynh…"
          value={reply}
          disabled={sending}
          onChange={(e) => onReplyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          aria-label="Trả lời"
        />
        <button
          type="button"
          className="tdh-inline-btn primary tdh-message-inbox-send"
          disabled={!reply.trim() || sending}
          onClick={onSend}
        >
          {sending ? "Đang gửi…" : "Gửi"}
        </button>
      </div>
    </>
  );
}
