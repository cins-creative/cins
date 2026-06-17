"use client";

import {
  Image as ImageIcon,
  Paperclip,
  Pin,
  Search,
  Send,
  StickyNote,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  avatarBg,
  formatChatTime,
} from "@/lib/chat/avatar";
import {
  isPendingRoomId,
  pendingDirectRoomId,
} from "@/lib/chat/optimistic-thread";
import {
  CHAT_ORG_KIND_LABEL,
  CHAT_PARTICIPANT_KIND_LABEL,
  CHAT_THREAD_GROUP_LABEL,
  CHAT_THREAD_GROUP_ORDER,
  type ChatLaunchState,
  type ChatParticipantKind,
  type ChatThread,
  type ChatThreadGroup,
} from "@/lib/chat/types";

type Props = {
  launch: ChatLaunchState | null;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
};

function mergeLaunchThread(
  prev: ChatThread[],
  incoming: ChatThread,
): ChatThread[] {
  const rest = prev.filter(
    (thread) =>
      thread.id !== incoming.id &&
      thread.roomId !== incoming.roomId &&
      thread.peerUserId !== incoming.peerUserId &&
      !(incoming.peerUserId && thread.roomId === pendingDirectRoomId(incoming.peerUserId)),
  );
  return [incoming, ...rest];
}

type ChatSidePanel = "pin" | "media" | "notes";

const SIDE_PANEL_LABEL: Record<ChatSidePanel, string> = {
  pin: "Tin đã ghim",
  media: "Ảnh & file",
  notes: "Ghi chú",
};

function threadKindLabel(thread: ChatThread): string {
  if (thread.kind === "org" && thread.orgKind) {
    return CHAT_ORG_KIND_LABEL[thread.orgKind];
  }
  return CHAT_PARTICIPANT_KIND_LABEL[thread.kind];
}

function threadKindClass(thread: ChatThread): string {
  if (thread.kind === "org" && thread.orgKind) {
    return ` is-org is-${thread.orgKind}`;
  }
  return thread.kind === "org" ? " is-org" : " is-user";
}

function ChatAvatar({
  initial,
  hue,
  size = 40,
  kind = "user",
  verified = false,
  avatarUrl = null,
}: {
  initial: string;
  hue: number;
  size?: number;
  kind?: ChatParticipantKind;
  verified?: boolean;
  avatarUrl?: string | null;
}) {
  return (
    <span className="cins-chat-avatar-wrap">
      <span
        className={`cins-chat-avatar${kind === "org" ? " is-org" : ""}${avatarUrl ? " has-image" : ""}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: avatarUrl ? "transparent" : avatarBg(hue),
        }}
        aria-hidden
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      {kind === "org" && verified ? (
        <span className="cins-chat-avatar-verified" aria-label="Verified">
          ✓
        </span>
      ) : null}
    </span>
  );
}

function ChatKindPill({ thread }: { thread: ChatThread }) {
  return (
    <span className={`cins-chat-kind-pill${threadKindClass(thread)}`}>
      {threadKindLabel(thread)}
    </span>
  );
}

function ChatThreadRow({
  thread,
  isActive,
  onSelect,
}: {
  thread: ChatThread;
  isActive: boolean;
  onSelect: (thread: ChatThread) => void;
}) {
  const preview = thread.typing ? "… đang gõ" : thread.preview;

  return (
    <li>
      <button
        type="button"
        className={`cins-chat-thread${isActive ? " is-active" : ""}${thread.kind === "org" ? " is-org-thread" : " is-user-thread"}`}
        onClick={() => onSelect(thread)}
      >
        <ChatAvatar
          initial={thread.avatarInitial}
          hue={thread.avatarHue}
          kind={thread.kind}
          verified={thread.verified}
          avatarUrl={thread.avatarUrl}
        />
        <span className="cins-chat-thread-main">
          <span className="cins-chat-thread-top">
            <span className="cins-chat-thread-name">
              <strong>{thread.name}</strong>
              <ChatKindPill thread={thread} />
            </span>
            <time dateTime={thread.lastAt}>{formatChatTime(thread.lastAt)}</time>
          </span>
          <span className="cins-chat-thread-bottom">
            <span className="cins-chat-thread-preview">
              {thread.kind === "user" && !thread.typing ? (
                <span className="cins-chat-thread-role">{thread.role}</span>
              ) : null}
              {preview}
            </span>
            {thread.unread > 0 ? (
              <span className="cins-chat-unread">{thread.unread}</span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

export function CinsChatOverlay({ launch, onClose, onUnreadChange }: Props) {
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    launch?.thread ? [launch.thread] : [],
  );
  const [activeId, setActiveId] = useState(() => launch?.thread?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(() => Boolean(launch?.thread));
  const [sidePanel, setSidePanel] = useState<ChatSidePanel | null>(null);
  const [activeTab, setActiveTab] = useState<ChatThreadGroup>(
    () => launch?.tab ?? launch?.thread?.group ?? "ban_be",
  );
  const [portalReady, setPortalReady] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(() => !launch?.thread);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [hydratedRoomIds, setHydratedRoomIds] = useState<Set<string>>(() => new Set());
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fetchedRoomIdsRef = useRef<Set<string>>(new Set());

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );

  const loadingMessages = active?.roomId != null && loadingRoomId === active.roomId;
  const isPendingRoom = active?.roomId != null && isPendingRoomId(active.roomId);
  const messagesLoaded =
    active?.roomId != null &&
    (hydratedRoomIds.has(active.roomId) || isPendingRoom);
  const connecting = Boolean(launch?.resolving && isPendingRoom);

  const markRoomHydrated = useCallback((roomId: string) => {
    fetchedRoomIdsRef.current.add(roomId);
    setHydratedRoomIds((prev) => {
      if (prev.has(roomId)) return prev;
      const next = new Set(prev);
      next.add(roomId);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (t.group !== activeTab) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        threadKindLabel(t).toLowerCase().includes(q)
      );
    });
  }, [threads, query, activeTab]);

  const tabUnread = useMemo(() => {
    const counts = Object.fromEntries(
      CHAT_THREAD_GROUP_ORDER.map((group) => [group, 0]),
    ) as Record<ChatThreadGroup, number>;

    for (const thread of threads) {
      counts[thread.group] += thread.unread;
    }

    return counts;
  }, [threads]);

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unread, 0),
    [threads],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!launch?.thread) return;

    const incoming = launch.thread;
    setThreads((prev) => mergeLaunchThread(prev, incoming));
    setActiveId(incoming.id);
    setActiveTab(launch.tab ?? incoming.group);
    setMobileShowThread(true);

    if (incoming.peerUserId) {
      const pendingId = pendingDirectRoomId(incoming.peerUserId);
      if (
        fetchedRoomIdsRef.current.has(pendingId) &&
        !isPendingRoomId(incoming.roomId)
      ) {
        fetchedRoomIdsRef.current.delete(pendingId);
        markRoomHydrated(incoming.roomId);
      }
    }
  }, [launch?.thread, launch?.tab, markRoomHydrated]);

  useEffect(() => {
    void (async () => {
      setLoadError(null);
      if (!launch?.thread) {
        setLoadingThreads(true);
      }

      try {
        const res = await fetch("/api/chat/threads", { cache: "no-store" });
        const json = (await res.json()) as {
          threads?: ChatThread[];
          totalUnread?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Không tải được hội thoại.");
        }

        setThreads((prev) => {
          let next = json.threads ?? [];
          if (launch?.thread) {
            next = mergeLaunchThread(next, launch.thread);
          }
          return next;
        });
        onUnreadChange(json.totalUnread ?? 0);

        setActiveId((current) => {
          if (launch?.thread) return launch.thread.id;
          if (current) return current;
          return json.threads?.[0]?.id ?? "";
        });
      } catch (error) {
        if (!launch?.thread) {
          setLoadError(
            error instanceof Error ? error.message : "Không tải được hội thoại.",
          );
        }
      } finally {
        setLoadingThreads(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.id, active?.messages.length]);

  const loadMessages = useCallback(
    async (roomId: string) => {
      if (fetchedRoomIdsRef.current.has(roomId) || isPendingRoomId(roomId)) return;

      setLoadingRoomId(roomId);
      setLoadError(null);
      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          messages?: ChatThread["messages"];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Không tải được tin nhắn.");
        }

        markRoomHydrated(roomId);
        setThreads((prev) => {
          const next = prev.map((t) =>
            t.id === roomId
              ? {
                  ...t,
                  messages: json.messages ?? [],
                  unread: 0,
                }
              : t,
          );
          onUnreadChange(next.reduce((sum, t) => sum + t.unread, 0));
          return next;
        });
      } catch (error) {
        markRoomHydrated(roomId);
        setLoadError(
          error instanceof Error ? error.message : "Không tải được tin nhắn.",
        );
      } finally {
        setLoadingRoomId((current) => (current === roomId ? null : current));
      }
    },
    [markRoomHydrated, onUnreadChange],
  );

  useEffect(() => {
    const roomId = active?.roomId;
    if (
      !roomId ||
      isPendingRoomId(roomId) ||
      fetchedRoomIdsRef.current.has(roomId)
    ) {
      return;
    }
    void loadMessages(roomId);
  }, [active?.roomId, loadMessages]);

  const selectThread = useCallback(
    (thread: ChatThread) => {
      setActiveId(thread.id);
      setMobileShowThread(true);
      setSidePanel(null);
      setActiveTab(thread.group);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, unread: 0 } : t)),
      );
      if (!fetchedRoomIdsRef.current.has(thread.roomId)) {
        void loadMessages(thread.roomId);
      } else if (thread.messages.length > 0) {
        void fetch(`/api/chat/rooms/${thread.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_tin_nhan_cuoi: thread.messages.at(-1)?.id,
          }),
        });
      }
    },
    [loadMessages],
  );

  const toggleSidePanel = useCallback((panel: ChatSidePanel) => {
    setSidePanel((cur) => (cur === panel ? null : panel));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || !active || sending || isPendingRoomId(active.roomId)) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/rooms/${active.roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noi_dung: text }),
      });
      const json = (await res.json()) as {
        message?: ChatThread["messages"][number];
        error?: string;
      };
      if (!res.ok || !json.message) {
        throw new Error(json.error ?? "Không gửi được tin nhắn.");
      }

      setThreads((prev) =>
        prev.map((t) =>
          t.id === active.id
            ? {
                ...t,
                messages: [...t.messages, json.message!],
                preview: text,
                lastAt: json.message!.sentAt,
              }
            : t,
        ),
      );
      setDraft("");
      inputRef.current?.focus();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Không gửi được tin nhắn.",
      );
    } finally {
      setSending(false);
    }
  }, [active, draft, sending]);

  if (!portalReady) return null;

  const panel = (
    <div className="cins-chat-root" role="presentation">
      <button
        type="button"
        className="cins-chat-backdrop"
        aria-label="Đóng tin nhắn"
        onClick={onClose}
      />

      <section
        className={`cins-chat-panel${sidePanel ? " has-side-panel" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tin nhắn"
      >
        <aside
          className={`cins-chat-list${mobileShowThread ? " is-hidden-mobile" : ""}`}
        >
          <header className="cins-chat-list-head">
            <div>
              <h2 className="cins-chat-title">Tin nhắn</h2>
              {totalUnread > 0 ? (
                <p className="cins-chat-subtitle">{totalUnread} chưa đọc</p>
              ) : null}
            </div>
            <button
              type="button"
              className="cins-chat-icon-btn"
              aria-label="Đóng"
              onClick={onClose}
            >
              <X size={18} strokeWidth={1.8} aria-hidden />
            </button>
          </header>

          <label className="cins-chat-search">
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm hội thoại"
            />
          </label>

          <div
            className="cins-chat-thread-tabs"
            role="tablist"
            aria-label="Nhóm hội thoại"
          >
            {CHAT_THREAD_GROUP_ORDER.map((group) => (
              <button
                key={group}
                type="button"
                role="tab"
                id={`cins-chat-tab-${group}`}
                aria-selected={activeTab === group}
                aria-controls={`cins-chat-tabpanel-${group}`}
                className={`cins-chat-thread-tab${activeTab === group ? " is-active" : ""}`}
                onClick={() => setActiveTab(group)}
              >
                {CHAT_THREAD_GROUP_LABEL[group]}
                {tabUnread[group] > 0 ? (
                  <span className="cins-chat-thread-tab-unread">{tabUnread[group]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div
            className="cins-chat-threads"
            role="tabpanel"
            id={`cins-chat-tabpanel-${activeTab}`}
            aria-labelledby={`cins-chat-tab-${activeTab}`}
          >
            {loadingThreads ? (
              <p className="cins-chat-threads-empty">Đang tải hội thoại…</p>
            ) : loadError ? (
              <p className="cins-chat-threads-empty">{loadError}</p>
            ) : filtered.length > 0 ? (
              <ul role="list">
                {filtered.map((thread) => (
                  <ChatThreadRow
                    key={thread.id}
                    thread={thread}
                    isActive={thread.id === activeId}
                    onSelect={selectThread}
                  />
                ))}
              </ul>
            ) : (
              <p className="cins-chat-threads-empty">
                {query.trim()
                  ? "Không tìm thấy hội thoại trong nhóm này."
                  : "Chưa có hội thoại trong nhóm này."}
              </p>
            )}
          </div>
        </aside>

        <div
          className={`cins-chat-main${mobileShowThread ? " is-visible-mobile" : ""}`}
        >
          {active ? (
          <div className="cins-chat-convo">
          <header className="cins-chat-convo-head">
            <button
              type="button"
              className="cins-chat-back-mobile"
              aria-label="Quay lại danh sách"
              onClick={() => setMobileShowThread(false)}
            >
              ←
            </button>
            <ChatAvatar
              initial={active.avatarInitial}
              hue={active.avatarHue}
              size={36}
              kind={active.kind}
              verified={active.verified}
              avatarUrl={active.avatarUrl}
            />
            <div className="cins-chat-convo-meta">
              <span className="cins-chat-convo-title">
                <strong>{active.name}</strong>
                <ChatKindPill thread={active} />
              </span>
              <span>
                {active.online ? (
                  <>
                    <span className="cins-chat-online-dot" aria-hidden />
                    Đang hoạt động
                  </>
                ) : (
                  active.role
                )}
              </span>
            </div>
            <div className="cins-chat-convo-actions">
              <button
                type="button"
                className={`cins-chat-icon-btn${sidePanel === "pin" ? " is-active" : ""}`}
                aria-label="Ghim"
                aria-pressed={sidePanel === "pin"}
                title="Tin đã ghim"
                onClick={() => toggleSidePanel("pin")}
              >
                <Pin size={16} strokeWidth={1.8} aria-hidden />
              </button>
              <button
                type="button"
                className={`cins-chat-icon-btn${sidePanel === "media" ? " is-active" : ""}`}
                aria-label="Ảnh và file"
                aria-pressed={sidePanel === "media"}
                title="Ảnh & file"
                onClick={() => toggleSidePanel("media")}
              >
                <ImageIcon size={16} strokeWidth={1.8} aria-hidden />
              </button>
              <button
                type="button"
                className={`cins-chat-icon-btn${sidePanel === "notes" ? " is-active" : ""}`}
                aria-label="Ghi chú"
                aria-pressed={sidePanel === "notes"}
                title="Ghi chú"
                onClick={() => toggleSidePanel("notes")}
              >
                <StickyNote size={16} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </header>

          <div className="cins-chat-messages">
            {connecting ? (
              <p className="cins-chat-messages-empty">Đang kết nối hội thoại…</p>
            ) : loadingMessages ? (
              <p className="cins-chat-messages-empty">Đang tải tin nhắn…</p>
            ) : messagesLoaded && active.messages.length === 0 ? (
              <p className="cins-chat-messages-empty">
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện với{" "}
                <strong>{active.name}</strong>…
              </p>
            ) : loadError ? (
              <p className="cins-chat-messages-empty">{loadError}</p>
            ) : null}
            {active.messages.map((msg) => (
              <div
                key={msg.id}
                className={`cins-chat-bubble-row${msg.from === "me" ? " is-me" : ""}`}
              >
                {msg.from === "them" ? (
                  <ChatAvatar
                    initial={active.avatarInitial}
                    hue={active.avatarHue}
                    size={28}
                    kind={active.kind}
                    verified={active.verified}
                    avatarUrl={active.avatarUrl}
                  />
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

          <footer className="cins-chat-compose">
            <div className="cins-chat-input-wrap">
              <button
                type="button"
                className="cins-chat-attach"
                aria-label="Đính kèm"
                disabled
              >
                <Paperclip size={18} strokeWidth={1.8} aria-hidden />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                disabled={connecting || isPendingRoom}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  connecting || isPendingRoom
                    ? "Đang kết nối hội thoại…"
                    : "Viết tin nhắn…"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="cins-chat-send"
              aria-label="Gửi"
              disabled={!draft.trim() || sending || connecting || isPendingRoom}
              onClick={() => void sendMessage()}
            >
              <Send size={16} strokeWidth={2} aria-hidden />
            </button>
          </footer>
          </div>
          ) : (
            <div className="cins-chat-convo cins-chat-convo-empty">
              <p>Chọn hội thoại để bắt đầu nhắn tin.</p>
            </div>
          )}

          {sidePanel && active ? (
            <aside
              className="cins-chat-side"
              aria-label={SIDE_PANEL_LABEL[sidePanel]}
            >
              <header className="cins-chat-side-head">
                <h3 className="cins-chat-side-title">{SIDE_PANEL_LABEL[sidePanel]}</h3>
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Đóng panel"
                  onClick={() => setSidePanel(null)}
                >
                  <X size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </header>

              <div className="cins-chat-side-body">
                {sidePanel === "pin" ? (
                  <ul className="cins-chat-side-list" role="list">
                    {active.messages.slice(0, 2).map((msg) => (
                      <li key={msg.id} className="cins-chat-side-pin">
                        <p>{msg.body}</p>
                        <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
                      </li>
                    ))}
                    {active.messages.length === 0 ? (
                      <p className="cins-chat-side-empty">Chưa có tin ghim.</p>
                    ) : null}
                  </ul>
                ) : null}

                {sidePanel === "media" ? (
                  <div className="cins-chat-side-media">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className="cins-chat-side-media-cell"
                        style={{ background: avatarBg(active.avatarHue + i * 18) }}
                        aria-hidden
                      />
                    ))}
                    <p className="cins-chat-side-hint">Ảnh và file chia sẻ trong hội thoại.</p>
                  </div>
                ) : null}

                {sidePanel === "notes" ? (
                  <div className="cins-chat-side-notes">
                    <p className="cins-chat-side-hint">
                      Ghi chú riêng — chỉ bạn thấy trong cuộc trò chuyện với{" "}
                      <strong>{active.name}</strong>.
                    </p>
                    <textarea
                      className="cins-chat-side-note-input"
                      rows={8}
                      placeholder="Ghi chú về đối tác, brief, deadline…"
                      defaultValue=""
                    />
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );

  return createPortal(panel, document.body);
}
