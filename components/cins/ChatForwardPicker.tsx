"use client";

import { Forward, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { avatarBg } from "@/lib/chat/avatar";
import { forwardMessageToRoom } from "@/lib/chat/forward-message-client";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";

type Props = {
  message: ChatMessage;
  excludeRoomId?: string | null;
  onClose: () => void;
  onDone?: (thread: ChatThread, messages: ChatMessage[]) => void;
  onError?: (error: string) => void;
};

export function ChatForwardPicker({
  message,
  excludeRoomId,
  onClose,
  onDone,
  onError,
}: Props) {
  const { getCachedThreads } = useCinsChat();
  const [portalReady, setPortalReady] = useState(false);
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const cached = getCachedThreads()?.threads;
    return cached ?? [];
  });
  const [loading, setLoading] = useState(() => !getCachedThreads()?.threads?.length);
  const [sendingRoomId, setSendingRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedThreads()?.threads;
    if (cached?.length) {
      setThreads(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void fetch("/api/chat/threads", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tải được danh sách chat.");
        const json = (await res.json()) as { threads?: ChatThread[] };
        if (!cancelled) {
          setThreads(json.threads ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (!cached?.length) {
          setError(
            err instanceof Error ? err.message : "Không tải được danh sách chat.",
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getCachedThreads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((thread) => {
      if (excludeRoomId && thread.roomId === excludeRoomId) return false;
      if (thread.roomTrangThai === "an") return false;
      if (!q) return true;
      return thread.name.toLowerCase().includes(q);
    });
  }, [excludeRoomId, query, threads]);

  const handlePick = async (thread: ChatThread) => {
    if (sendingRoomId) return;
    setSendingRoomId(thread.roomId);
    setError(null);
    const result = await forwardMessageToRoom(thread.roomId, message);
    setSendingRoomId(null);
    if (!result.ok) {
      setError(result.error);
      onError?.(result.error);
      return;
    }
    onDone?.(thread, result.messages);
    onClose();
  };

  if (!portalReady) return null;

  return createPortal(
    <div
      className="cins-chat-group-modal-root cins-chat-forward-root"
      role="presentation"
    >
      <button
        type="button"
        className="cins-chat-group-modal-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="cins-chat-group-modal cins-chat-forward-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cins-chat-forward-title"
      >
        <header className="cins-chat-group-modal-head">
          <span className="cins-chat-group-modal-icon" aria-hidden>
            <Forward size={18} strokeWidth={2} />
          </span>
          <div>
            <h3 id="cins-chat-forward-title">Chuyển tiếp</h3>
            <p>Chọn hội thoại để gửi lại tin nhắn</p>
          </div>
          <button
            type="button"
            className="cins-chat-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <label className="cins-chat-search cins-chat-group-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm hội thoại…"
            autoFocus
          />
        </label>

        <div className="cins-chat-group-list">
          {loading ? (
            <p className="cins-chat-group-list-empty">
              <Loader2 size={16} className="cins-chat-spin" aria-hidden /> Đang tải…
            </p>
          ) : filtered.length === 0 ? (
            <p className="cins-chat-group-list-empty">Không có hội thoại phù hợp.</p>
          ) : (
            <ul role="list">
              {filtered.map((thread) => {
                const busy = sendingRoomId === thread.roomId;
                return (
                  <li key={thread.roomId}>
                    <button
                      type="button"
                      className="cins-chat-group-pick"
                      disabled={Boolean(sendingRoomId)}
                      onClick={() => void handlePick(thread)}
                    >
                      <span
                        className={`cins-chat-group-pick-avatar${thread.avatarUrl ? " has-image" : ""}`}
                        style={
                          thread.avatarUrl
                            ? undefined
                            : { background: avatarBg(thread.avatarHue) }
                        }
                        aria-hidden
                      >
                        {thread.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thread.avatarUrl} alt="" />
                        ) : (
                          thread.avatarInitial
                        )}
                      </span>
                      <span className="cins-chat-group-pick-label">{thread.name}</span>
                      {busy ? (
                        <Loader2 size={16} className="cins-chat-spin" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error ? <p className="cins-chat-group-error">{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
