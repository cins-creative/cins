"use client";

import { Maximize2, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { avatarBg, formatChatTime } from "@/lib/chat/avatar";
import { appendChatMessageIfNew, type ChatRealtimeMessageEvent } from "@/lib/chat/realtime";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";

const RECONCILE_MS = 120_000;

function peekKey(thread: ChatThread): string {
  return `${thread.roomId}:${thread.lastAt}`;
}

function pickLatestUnread(threads: ChatThread[]): ChatThread | null {
  return (
    threads
      .filter((t) => t.unread > 0)
      .sort(
        (a, b) =>
          new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
      )[0] ?? null
  );
}

function MiniAvatar({
  thread,
  size = 36,
}: {
  thread: ChatThread;
  size?: number;
}) {
  return (
    <span
      className={`j-chat-mini-avatar${thread.avatarUrl ? " has-image" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: thread.avatarUrl ? "transparent" : avatarBg(thread.avatarHue),
      }}
      aria-hidden
    >
      {thread.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={thread.avatarUrl} alt="" />
      ) : (
        thread.avatarInitial
      )}
    </span>
  );
}

export function CinsChatFloatingStack() {
  const {
    open,
    openChat,
    setTotalUnread,
    viewerProfileId,
    subscribeChatMessages,
    setChatFocus,
  } = useCinsChat();
  const [peekThread, setPeekThread] = useState<ChatThread | null>(null);
  const [miniThread, setMiniThread] = useState<ChatThread | null>(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dismissedPeekRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const miniOpenRef = useRef(false);
  const miniRoomIdRef = useRef<string | null>(null);

  miniOpenRef.current = miniOpen;
  miniRoomIdRef.current = miniThread?.roomId ?? null;

  const syncThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        threads?: ChatThread[];
        totalUnread?: number;
      };
      setTotalUnread(json.totalUnread ?? 0);

      if (open || miniOpen) return;

      const latest = pickLatestUnread(json.threads ?? []);
      if (latest && dismissedPeekRef.current !== peekKey(latest)) {
        setPeekThread(latest);
      } else if (!latest) {
        setPeekThread(null);
      }
    } catch {
      /* ignore */
    }
  }, [miniOpen, open, setTotalUnread]);

  const applyPeekFromThreads = useCallback(
    (threads: ChatThread[]) => {
      if (open || miniOpenRef.current) return;
      const latest = pickLatestUnread(threads);
      if (latest && dismissedPeekRef.current !== peekKey(latest)) {
        setPeekThread(latest);
      } else if (!latest) {
        setPeekThread(null);
      }
    },
    [open],
  );

  const refreshPeekForEvent = useCallback(
    async (event: ChatRealtimeMessageEvent) => {
      if (open || miniOpenRef.current || event.senderId === viewerProfileId) {
        return;
      }

      try {
        const res = await fetch("/api/chat/threads", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          threads?: ChatThread[];
          totalUnread?: number;
        };
        setTotalUnread(json.totalUnread ?? 0);
        applyPeekFromThreads(json.threads ?? []);
      } catch {
        /* ignore */
      }
    },
    [applyPeekFromThreads, open, setTotalUnread, viewerProfileId],
  );

  useEffect(() => {
    void syncThreads();
    const id = window.setInterval(() => void syncThreads(), RECONCILE_MS);
    const onFocus = () => void syncThreads();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncThreads]);

  useEffect(() => {
    if (miniOpen && miniThread) {
      setChatFocus(miniThread.roomId, "mini");
      return () => setChatFocus(null, null);
    }
    setChatFocus(null, null);
    return undefined;
  }, [miniOpen, miniThread, setChatFocus]);

  useEffect(() => {
    return subscribeChatMessages((event) => {
      if (open) return;

      if (miniOpenRef.current && miniRoomIdRef.current === event.roomId) {
        setMessages((prev) => appendChatMessageIfNew(prev, event.message));
        setMiniThread((prev) =>
          prev
            ? {
                ...prev,
                preview: event.preview,
                lastAt: event.lastAt,
              }
            : prev,
        );

        if (event.message.from === "them") {
          void fetch(`/api/chat/rooms/${event.roomId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_tin_nhan_cuoi: event.message.id }),
          });
        }
        return;
      }

      if (miniOpenRef.current || event.senderId === viewerProfileId) return;

      setPeekThread((prev) => {
        const nextKey = `${event.roomId}:${event.lastAt}`;
        if (dismissedPeekRef.current === nextKey) return null;

        if (prev?.roomId === event.roomId) {
          return {
            ...prev,
            preview: event.preview,
            lastAt: event.lastAt,
            unread: prev.unread + 1,
          };
        }
        return prev;
      });

      void refreshPeekForEvent(event);
    });
  }, [
    open,
    refreshPeekForEvent,
    subscribeChatMessages,
    viewerProfileId,
  ]);

  useEffect(() => {
    if (open) {
      setMiniOpen(false);
      setMiniThread(null);
      setPeekThread(null);
    }
  }, [open]);

  const loadMiniMessages = useCallback(async (thread: ChatThread) => {
    setLoadingMessages(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Không tải được tin nhắn.");
      }

      const loaded = json.messages ?? [];
      setMessages(loaded);

      const lastId = loaded.at(-1)?.id;
      if (lastId) {
        await fetch(`/api/chat/rooms/${thread.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tin_nhan_cuoi: lastId }),
        });
      }

      const threadsRes = await fetch("/api/chat/threads", { cache: "no-store" });
      if (threadsRes.ok) {
        const threadsJson = (await threadsRes.json()) as { totalUnread?: number };
        setTotalUnread(threadsJson.totalUnread ?? 0);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Không tải được tin nhắn.",
      );
    } finally {
      setLoadingMessages(false);
    }
  }, [setTotalUnread]);

  const openMini = useCallback(
    (thread: ChatThread) => {
      setPeekThread(null);
      setMiniThread(thread);
      setMiniOpen(true);
      setMessages([]);
      setDraft("");
      void loadMiniMessages(thread);
    },
    [loadMiniMessages],
  );

  const dismissPeek = useCallback(() => {
    if (peekThread) {
      dismissedPeekRef.current = peekKey(peekThread);
    }
    setPeekThread(null);
  }, [peekThread]);

  const closeMini = useCallback(() => {
    setMiniOpen(false);
    setMiniThread(null);
    setMessages([]);
    setDraft("");
    setLoadError(null);
    void syncThreads();
  }, [syncThreads]);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || !miniThread || sending) return;

    setSending(true);
    try {
      const res = await fetch(
        `/api/chat/rooms/${miniThread.roomId}/messages`,
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
        throw new Error(json.error ?? "Không gửi được tin nhắn.");
      }

      setMessages((prev) => appendChatMessageIfNew(prev, json.message!));
      setDraft("");
      inputRef.current?.focus();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Không gửi được tin nhắn.",
      );
    } finally {
      setSending(false);
    }
  }, [draft, miniThread, sending]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, miniOpen]);

  useEffect(() => {
    if (miniOpen) {
      inputRef.current?.focus();
    }
  }, [miniOpen]);

  if (open) return null;

  return (
    <>
      {miniOpen && miniThread ? (
        <section
          className="j-chat-mini"
          role="dialog"
          aria-label={`Chat với ${miniThread.name}`}
        >
          <header className="j-chat-mini-head">
            <MiniAvatar thread={miniThread} size={34} />
            <div className="j-chat-mini-meta">
              <strong>{miniThread.name}</strong>
              <span>{miniThread.role || "Tin nhắn trực tiếp"}</span>
            </div>
            <div className="j-chat-mini-actions">
              <button
                type="button"
                className="j-chat-mini-icon-btn"
                aria-label="Mở cửa sổ tin nhắn đầy đủ"
                title="Mở rộng"
                onClick={() =>
                  void openChat({
                    roomId: miniThread.roomId,
                    tab: miniThread.group,
                  })
                }
              >
                <Maximize2 size={15} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="j-chat-mini-icon-btn"
                aria-label="Đóng"
                onClick={closeMini}
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </header>

          <div className="j-chat-mini-messages">
            {loadingMessages ? (
              <p className="j-chat-mini-empty">Đang tải tin nhắn…</p>
            ) : loadError && messages.length === 0 ? (
              <p className="j-chat-mini-empty">{loadError}</p>
            ) : messages.length === 0 ? (
              <p className="j-chat-mini-empty">
                Bắt đầu trò chuyện với <strong>{miniThread.name}</strong>
              </p>
            ) : null}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`cins-chat-bubble-row${msg.from === "me" ? " is-me" : ""}`}
              >
                {msg.from === "them" ? (
                  <MiniAvatar thread={miniThread} size={26} />
                ) : null}
                <div
                  className={`cins-chat-bubble${msg.from === "me" ? " is-me" : " is-them"}`}
                >
                  <p>{msg.body}</p>
                  <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer className="j-chat-mini-compose">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={loadingMessages || sending}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Viết tin nhắn…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <button
              type="button"
              className="j-chat-mini-send"
              aria-label="Gửi"
              disabled={!draft.trim() || sending || loadingMessages}
              onClick={() => void sendMessage()}
            >
              <Send size={15} strokeWidth={2.2} aria-hidden />
            </button>
          </footer>
        </section>
      ) : null}

      {!miniOpen && peekThread ? (
        <div className="j-chat-peek" role="status" aria-live="polite">
          <button
            type="button"
            className="j-chat-peek-body"
            onClick={() => openMini(peekThread)}
          >
            <MiniAvatar thread={peekThread} size={40} />
            <span className="j-chat-peek-copy">
              <strong>{peekThread.name}</strong>
              <span className="j-chat-peek-preview">{peekThread.preview}</span>
            </span>
            {peekThread.unread > 0 ? (
              <span className="j-chat-peek-unread">{peekThread.unread}</span>
            ) : null}
          </button>
          <button
            type="button"
            className="j-chat-peek-dismiss"
            aria-label="Ẩn thông báo"
            onClick={dismissPeek}
          >
            <X size={14} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );
}
