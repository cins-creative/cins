"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { InboxContactRoleBadge } from "@/components/truong/InboxContactRoleBadge";
import { InboxVerificationCard } from "@/components/truong/InboxVerificationCard";
import { avatarBg, avatarHueFromSeed } from "@/lib/chat/avatar";
import { inboxThreadNeedsAction, type OrgInboxThread, type OrgInboxThreadStatus } from "@/lib/chat/org-inbox-types";
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

function InboxStudentAvatar({ thread }: { thread: OrgInboxThread }) {
  const size = 28;
  return (
    <span className="cins-chat-avatar-wrap">
      <span
        className={`cins-chat-avatar${thread.studentAvatarUrl ? " has-image" : ""}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: thread.studentAvatarUrl
            ? "transparent"
            : avatarBg(avatarHueFromSeed(thread.studentUserId)),
        }}
        aria-hidden
      >
        {thread.studentAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thread.studentAvatarUrl} alt="" />
        ) : (
          studentInitials(thread.studentName)
        )}
      </span>
    </span>
  );
}

type FilterKey = "all" | OrgInboxThreadStatus | "unread" | "verify";

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
  const [verifyPending, startVerifyTransition] = useTransition();

  const pendingVerifyCount = useMemo(
    () => threads.filter((t) => t.pendingVerification).length,
    [threads],
  );

  const unreadThreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  );

  /** Badge: tin chưa đọc + yêu cầu xác thực chờ duyệt. */
  const inboxBadgeCount = useMemo(
    () =>
      threads.reduce((sum, t) => sum + (t.unread ? t.unreadCount : 0), 0) +
      pendingVerifyCount,
    [threads, pendingVerifyCount],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return threads;
    if (filter === "unread") return threads.filter((t) => t.unread);
    if (filter === "verify") return threads.filter((t) => t.pendingVerification);
    return threads.filter((t) => t.status === filter);
  }, [threads, filter]);

  const selected = useMemo(
    () => threads.find((t) => t.studentUserId === selectedStudentId) ?? null,
    [threads, selectedStudentId],
  );

  const loadThreads = useCallback(async (options?: { silent?: boolean }) => {
    if (!ctx?.orgId) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoadingThreads(true);
      setLoadError(null);
    }
    try {
      const res = await fetch(`/api/org/${ctx.orgId}/inbox/threads`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        threads?: OrgInboxThread[];
        error?: string;
      };
      if (!res.ok) {
        if (!silent) {
          setLoadError(json.error ?? "Không tải được hộp thư.");
          setThreads([]);
        }
        return;
      }
      const next = Array.isArray(json.threads) ? json.threads : [];
      setThreads(next);
      if (!silent) {
        setFilter((current) => {
          const hasPendingVerify = next.some((t) => t.pendingVerification);
          if (hasPendingVerify) return "verify";
          if (current === "verify") return "open";
          return current;
        });
        setSelectedStudentId((current) => {
          if (current && next.some((t) => t.studentUserId === current)) return current;
          const verifyFirst = next.find((t) => t.pendingVerification)?.studentUserId;
          if (verifyFirst) return verifyFirst;
          return (
            next.find((t) => t.status === "open")?.studentUserId ??
            next[0]?.studentUserId ??
            null
          );
        });
      }
    } catch {
      if (!silent) {
        setLoadError("Lỗi mạng.");
        setThreads([]);
      }
    } finally {
      if (!silent) {
        setLoadingThreads(false);
      }
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
    if (!ctx?.canEdit || !ctx.isEditing || !ctx.orgId) return;

    void loadThreads({ silent: true });

    const refreshBadge = () => void loadThreads({ silent: true });
    const onFocus = () => refreshBadge();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshBadge();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(refreshBadge, 60_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [ctx?.canEdit, ctx?.isEditing, ctx?.orgId, loadThreads]);

  useEffect(() => {
    if (open) {
      void loadThreads();
    } else {
      setSelectedStudentId(null);
      setMessages([]);
      setReply("");
      void loadThreads({ silent: true });
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

  function respondVerification(action: "approve" | "reject") {
    if (!selected?.pendingVerification || !ctx?.orgId || verifyPending) return;

    startVerifyTransition(async () => {
      try {
        const res = await fetch(
          `/api/org/${ctx.orgId}/membership-milestone-requests/${selected.pendingVerification!.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          ctx.showToast(json.error ?? "Không cập nhật được.");
          return;
        }
        ctx.showToast(
          action === "approve" ? "Đã xác thực cột mốc" : "Đã từ chối yêu cầu",
        );
        setThreads((list) =>
          list.map((thread) =>
            thread.studentUserId === selected.studentUserId
              ? { ...thread, pendingVerification: null }
              : thread,
          ),
        );
        void loadThreads({ silent: true });
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
          inboxBadgeCount > 0
            ? `Tin nhắn — ${inboxBadgeCount} cần xử lý`
            : "Tin nhắn"
        }
      >
        <ChatIcon />
        <span className="ss-btn-messages-label">Tin nhắn</span>
        {inboxBadgeCount > 0 ? (
          <span className="ss-btn-messages-badge" aria-hidden>
            {inboxBadgeCount > 9 ? "9+" : inboxBadgeCount}
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
                  ["verify", "Chờ xác thực", pendingVerifyCount],
                  ["unread", "Chưa đọc", unreadThreadCount],
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
                verifyResponding={verifyPending}
                onReplyChange={setReply}
                onSend={() => void sendReply()}
                onApproveVerification={() => respondVerification("approve")}
                onRejectVerification={() => respondVerification("reject")}
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
        className={`tdh-message-inbox-thread${active ? " is-active" : ""}${thread.unread ? " is-unread" : ""}${thread.pendingVerification ? " has-verify" : ""}`}
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
              <InboxContactRoleBadge
                label={thread.studentContactLabel}
                roleKey={thread.studentContactRole}
                className="tdh-message-inbox-thread-role-badge"
              />
            </span>
            <time className="tdh-message-inbox-thread-time" dateTime={thread.lastAt}>
              {formatInboxTime(thread.lastAt)}
            </time>
          </span>
          <span className="tdh-message-inbox-thread-subject">
            {thread.pendingVerification ? (
              <span className="tdh-message-inbox-thread-verify-pill">Xác thực</span>
            ) : null}
            {thread.subject}
          </span>
          <span className="tdh-message-inbox-thread-preview">{thread.preview}</span>
        </span>
        {inboxThreadNeedsAction(thread) ? (
          <span
            className={`tdh-message-inbox-thread-dot${thread.pendingVerification && !thread.unread ? " is-verify" : ""}`}
            aria-hidden
          />
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
  verifyResponding,
  onReplyChange,
  onSend,
  onApproveVerification,
  onRejectVerification,
}: {
  thread: OrgInboxThread;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  reply: string;
  sending: boolean;
  verifyResponding: boolean;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  onApproveVerification: () => void;
  onRejectVerification: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [loading, messages]);

  const verification = thread.pendingVerification;

  return (
    <>
      {verification ? (
        <InboxVerificationCard
          request={verification}
          studentContactLabel={thread.studentContactLabel}
          studentContactRole={thread.studentContactRole}
          responding={verifyResponding}
          onApprove={onApproveVerification}
          onReject={onRejectVerification}
        />
      ) : (
        <header className="tdh-message-inbox-detail-hdr">
          <div>
            <h4 className="tdh-message-inbox-detail-title">{thread.studentName}</h4>
            <p className="tdh-message-inbox-detail-meta">
              <InboxContactRoleBadge
                label={thread.studentContactLabel}
                roleKey={thread.studentContactRole}
              />
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
      )}

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
            <ChatMessageThreadItems
              messages={messages}
              renderTheirAvatar={() => <InboxStudentAvatar thread={thread} />}
            />
          )}
          <div ref={messagesEndRef} />
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
