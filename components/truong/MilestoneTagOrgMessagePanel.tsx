"use client";

import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { formatChatTime } from "@/lib/chat/avatar";
import type { ChatMessage } from "@/lib/chat/types";

type Props = {
  orgId: string;
  studentUserId: string;
};

export function MilestoneTagOrgMessagePanel({ orgId, studentUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Không tải được tin nhắn.");
        setMessages([]);
        return;
      }
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    } catch {
      setError("Lỗi mạng.");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, studentUserId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSend() {
    const text = draft.trim();
    if (!text || pending) return;

    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/org/${encodeURIComponent(orgId)}/student-chat/${encodeURIComponent(studentUserId)}/messages`,
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
          setError(json.error ?? "Không gửi được tin nhắn.");
          return;
        }
        setDraft("");
        setMessages((prev) => [...prev, json.message!]);
      } catch {
        setError("Lỗi mạng.");
      }
    });
  }

  return (
    <section
      className="tdh-milestone-tag-detail-section tdh-milestone-tag-org-msg"
      aria-label="Gửi lời nhắn tới sinh viên"
    >
      <div className="tdh-milestone-tag-org-msg-head">
        <h5 className="tdh-milestone-tag-detail-post-label">Gửi lời nhắn</h5>
        <p className="tdh-milestone-tag-org-msg-hint">
          Tin nhắn sẽ hiển thị trong mục <strong>Tổ chức</strong> của sinh viên trên
          CINs Chat.
        </p>
      </div>

      <div
        ref={listRef}
        className="tdh-milestone-tag-org-msg-list"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <p className="tdh-milestone-tag-org-msg-empty">
            <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" aria-hidden />
            Đang tải…
          </p>
        ) : messages.length === 0 ? (
          <p className="tdh-milestone-tag-org-msg-empty">
            Chưa có tin nhắn. Gửi lời nhắn nếu cần thêm bằng chứng hoặc thông tin.
          </p>
        ) : (
          <ol className="tdh-milestone-tag-org-msg-thread">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`tdh-milestone-tag-org-msg-item${msg.from === "me" ? " is-out" : " is-in"}`}
              >
                <p>{msg.deleted ? "Tin nhắn đã thu hồi" : msg.body}</p>
                <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="tdh-milestone-tag-org-msg-compose">
        <textarea
          rows={2}
          value={draft}
          placeholder="Nhắn sinh viên về bằng chứng hoặc thông tin cần bổ sung…"
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          className="tdh-milestone-tag-org-msg-send"
          disabled={pending || !draft.trim()}
          aria-label="Gửi tin nhắn"
          onClick={handleSend}
        >
          {pending ? (
            <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" aria-hidden />
          ) : (
            <Send size={16} strokeWidth={2} aria-hidden />
          )}
          Gửi
        </button>
      </div>

      {error ? <p className="tdh-milestone-tag-org-msg-err">{error}</p> : null}
    </section>
  );
}
