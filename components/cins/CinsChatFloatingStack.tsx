"use client";

import { Maximize2, Paperclip, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ReactNode,
} from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { avatarBg, formatChatTime } from "@/lib/chat/avatar";
import { writeChatThreadsCache, writeRoomMessagesCache } from "@/lib/chat/chat-session-cache";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import { reconcileChatMessage, appendChatMessageIfNew, type ChatRealtimeMessageEvent } from "@/lib/chat/realtime";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";

const RECONCILE_MS = 120_000;

type MiniImageDraft = {
  previewUrl: string;
  imageId: string | null;
  uploading: boolean;
  error?: string;
};

function MiniChatMessageBody({ msg }: { msg: ChatMessage }) {
  const imageSrc =
    msg.imageUrl ??
    (msg.imageId ? chatImageDeliveryUrl(msg.imageId) : null);

  return (
    <>
      {imageSrc ? (
        <a
          className="j-chat-mini-msg-image-link"
          href={imageSrc}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="j-chat-mini-msg-image"
            src={imageSrc}
            alt={msg.body || "Ảnh đính kèm"}
          />
        </a>
      ) : null}
      {msg.body ? <p>{msg.body}</p> : null}
    </>
  );
}

function peekKey(thread: ChatThread): string {
  return `${thread.roomId}:${thread.lastAt}`;
}

function pickUnreadThreads(threads: ChatThread[]): ChatThread[] {
  return threads
    .filter((t) => t.unread > 0)
    .sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
}

function mergePeekThreads(
  current: ChatThread[],
  fromApi: ChatThread[],
  dismissedKeys: Set<string>,
): ChatThread[] {
  const apiByRoom = new Map(fromApi.map((t) => [t.roomId, t]));
  const merged = new Map<string, ChatThread>();

  for (const thread of current) {
    const fresh = apiByRoom.get(thread.roomId) ?? thread;
    if (dismissedKeys.has(peekKey(fresh))) continue;
    merged.set(thread.roomId, fresh);
  }

  for (const thread of pickUnreadThreads(fromApi)) {
    if (dismissedKeys.has(peekKey(thread))) continue;
    merged.set(thread.roomId, thread);
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
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

type CinsChatFloatingStackProps = {
  launcher: ReactNode;
};

export function CinsChatFloatingStack({ launcher }: CinsChatFloatingStackProps) {
  const {
    open,
    openChat,
    setTotalUnread,
    viewerProfileId,
    subscribeChatMessages,
    setChatFocus,
    getCachedThreads,
    getCachedRoomMessages,
    prefetchChatData,
    prefetchRoomMessages,
  } = useCinsChat();
  const [peekThreads, setPeekThreads] = useState<ChatThread[]>([]);
  const [dismissableRooms, setDismissableRooms] = useState<Set<string>>(
    () => new Set(),
  );
  const [miniThread, setMiniThread] = useState<ChatThread | null>(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<MiniImageDraft | null>(null);
  const dismissedPeekRef = useRef<Set<string>>(new Set());
  const viewedRoomsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageRef = useRef<MiniImageDraft | null>(null);
  const miniOpenRef = useRef(false);
  const miniRoomIdRef = useRef<string | null>(null);

  pendingImageRef.current = pendingImage;

  miniOpenRef.current = miniOpen;
  miniRoomIdRef.current = miniThread?.roomId ?? null;

  useEffect(() => {
    return () => {
      const pending = pendingImageRef.current;
      if (pending?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pending.previewUrl);
      }
    };
  }, []);

  const clearPendingImage = useCallback(() => {
    setPendingImage((prev) => {
      if (prev?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const uploadPendingImage = useCallback(async (file: File) => {
    if (!isAllowedUploadImageFile(file)) {
      setPendingImage({
        previewUrl: URL.createObjectURL(file),
        imageId: null,
        uploading: false,
        error: "File không phải ảnh.",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({
      previewUrl,
      imageId: null,
      uploading: true,
      error: undefined,
    });

    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        imageId?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.imageId) {
        throw new Error(data.error || "Upload thất bại.");
      }
      if (data.url) rememberCfAccountHashFromDeliveryUrl(data.url);

      setPendingImage((prev) => {
        if (prev?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return {
          previewUrl: data.url?.trim() || previewUrl,
          imageId: data.imageId!,
          uploading: false,
        };
      });
    } catch (error) {
      setPendingImage((prev) =>
        prev
          ? {
              ...prev,
              uploading: false,
              error:
                error instanceof Error ? error.message : "Upload thất bại.",
            }
          : prev,
      );
    }
  }, []);

  const addImageFile = useCallback(
    (file: File) => {
      void uploadPendingImage(file);
    },
    [uploadPendingImage],
  );

  const handleComposePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = imageFilesFromClipboard(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      addImageFile(files[0]!);
    },
    [addImageFile],
  );

  const syncThreads = useCallback(async () => {
    try {
      const snapshot = await prefetchChatData();
      if (!snapshot) return;

      if (viewerProfileId) {
        writeChatThreadsCache(viewerProfileId, snapshot);
      }

      if (open) return;

      setPeekThreads((prev) =>
        mergePeekThreads(
          prev,
          snapshot.threads,
          dismissedPeekRef.current,
        ),
      );
    } catch {
      /* ignore */
    }
  }, [open, prefetchChatData, viewerProfileId]);

  const applyPeekFromThreads = useCallback(
    (threads: ChatThread[]) => {
      if (open) return;
      setPeekThreads((prev) =>
        mergePeekThreads(prev, threads, dismissedPeekRef.current),
      );
    },
    [open],
  );

  const refreshPeekForEvent = useCallback(
    async (event: ChatRealtimeMessageEvent) => {
      if (open || event.senderId === viewerProfileId) {
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
    const cached = getCachedThreads();
    if (cached && !open) {
      setTotalUnread(cached.totalUnread);
      setPeekThreads((prev) =>
        mergePeekThreads(prev, cached.threads, dismissedPeekRef.current),
      );
    }
    void syncThreads();
    const id = window.setInterval(() => void syncThreads(), RECONCILE_MS);
    const onFocus = () => void syncThreads();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [getCachedThreads, open, setTotalUnread, syncThreads]);

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

      if (event.senderId === viewerProfileId) return;

      if (miniOpenRef.current) {
        void refreshPeekForEvent(event);
        return;
      }

      setPeekThreads((prev) => {
        const nextKey = `${event.roomId}:${event.lastAt}`;
        if (dismissedPeekRef.current.has(nextKey)) return prev;

        const idx = prev.findIndex((t) => t.roomId === event.roomId);
        if (idx === -1) return prev;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          preview: event.preview,
          lastAt: event.lastAt,
          unread: updated[idx].unread + 1,
        };
        return updated.sort(
          (a, b) =>
            new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
        );
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
      setPeekThreads([]);
    }
  }, [open]);

  const loadMiniMessages = useCallback(async (thread: ChatThread) => {
    const cached = getCachedRoomMessages(thread.roomId);
    if (cached) {
      setMessages(cached);
      setLoadingMessages(false);
    } else {
      setLoadingMessages(true);
    }
    setLoadError(null);

    try {
      const loaded =
        (await prefetchRoomMessages(thread.roomId)) ??
        cached ??
        [];

      setMessages(loaded);
      if (viewerProfileId) {
        writeRoomMessagesCache(viewerProfileId, thread.roomId, loaded);
      }
      viewedRoomsRef.current.add(thread.roomId);

      const lastId = loaded.at(-1)?.id;
      if (lastId) {
        void fetch(`/api/chat/rooms/${thread.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tin_nhan_cuoi: lastId }),
        });
      }

      const snapshot = await prefetchChatData();
      if (snapshot) {
        setPeekThreads((prev) =>
          mergePeekThreads(
            prev,
            snapshot.threads,
            dismissedPeekRef.current,
          ).map((t) =>
            t.roomId === thread.roomId ? { ...t, unread: 0 } : t,
          ),
        );
      }
    } catch (error) {
      if (!cached) {
        setLoadError(
          error instanceof Error ? error.message : "Không tải được tin nhắn.",
        );
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [
    getCachedRoomMessages,
    prefetchChatData,
    prefetchRoomMessages,
    viewerProfileId,
  ]);

  const markRoomDismissable = useCallback((roomId: string) => {
    if (!viewedRoomsRef.current.has(roomId)) return;
    setDismissableRooms((prev) => {
      if (prev.has(roomId)) return prev;
      const next = new Set(prev);
      next.add(roomId);
      return next;
    });
  }, []);

  const openMini = useCallback(
    (thread: ChatThread) => {
      const switching =
        miniOpen && miniThread && miniThread.roomId !== thread.roomId;
      const cached = getCachedRoomMessages(thread.roomId);

      if (switching && miniThread) {
        markRoomDismissable(miniThread.roomId);
      }

      setMiniThread(thread);
      setMiniOpen(true);
      if (switching) {
        setMessages(cached ?? []);
        setDraft("");
        setLoadError(null);
        clearPendingImage();
      } else if (!miniOpen) {
        setMessages(cached ?? []);
        setDraft("");
      }
      void loadMiniMessages(thread);
    },
    [
      clearPendingImage,
      getCachedRoomMessages,
      loadMiniMessages,
      markRoomDismissable,
      miniOpen,
      miniThread,
    ],
  );

  const dismissBubble = useCallback(
    (thread: ChatThread) => {
      if (thread.unread > 0) return;

      dismissedPeekRef.current.add(peekKey(thread));
      viewedRoomsRef.current.delete(thread.roomId);
      setDismissableRooms((prev) => {
        if (!prev.has(thread.roomId)) return prev;
        const next = new Set(prev);
        next.delete(thread.roomId);
        return next;
      });
      setPeekThreads((prev) => prev.filter((t) => t.roomId !== thread.roomId));
      if (miniThread?.roomId === thread.roomId) {
        setMiniOpen(false);
        setMiniThread(null);
        setMessages([]);
        setDraft("");
        setLoadError(null);
        clearPendingImage();
      }
    },
    [clearPendingImage, miniThread?.roomId],
  );

  const closeMini = useCallback(() => {
    const roomId = miniThread?.roomId;
    if (roomId) {
      markRoomDismissable(roomId);
    }
    setMiniOpen(false);
    setMiniThread(null);
    setMessages([]);
    setDraft("");
    setLoadError(null);
    clearPendingImage();
    void syncThreads();
  }, [clearPendingImage, markRoomDismissable, miniThread?.roomId, syncThreads]);

  const canSend =
    Boolean(miniThread) &&
    !pendingImage?.uploading &&
    (draft.trim().length > 0 || Boolean(pendingImage?.imageId));

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    const imageId = pendingImage?.imageId;
    if ((!text && !imageId) || !miniThread || pendingImage?.uploading) {
      return;
    }

    const optimistic = createOptimisticChatMessage({
      body: text,
      imageId,
      imageUrl: pendingImage?.previewUrl.startsWith("blob:")
        ? pendingImage.previewUrl
        : null,
    });
    const snapshotText = text;
    const snapshotImage = pendingImage;

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    clearPendingImage();
    inputRef.current?.focus();

    try {
      const payload: { noi_dung?: string; cloudflare_image_id?: string } = {};
      if (snapshotText) payload.noi_dung = snapshotText;
      if (imageId) payload.cloudflare_image_id = imageId;

      const res = await fetch(
        `/api/chat/rooms/${miniThread.roomId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok || !json.message) {
        throw new Error(json.error ?? "Không gửi được tin nhắn.");
      }

      setMessages((prev) => {
        const next = reconcileChatMessage(prev, json.message!);
        if (viewerProfileId) {
          writeRoomMessagesCache(viewerProfileId, miniThread.roomId, next);
        }
        return next;
      });

      setMiniThread((prev) =>
        prev
          ? {
              ...prev,
              preview: messagePreviewText(json.message!),
              lastAt: json.message!.sentAt,
            }
          : prev,
      );
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(snapshotText);
      if (snapshotImage) {
        setPendingImage(snapshotImage);
      }
      setLoadError(
        error instanceof Error ? error.message : "Không gửi được tin nhắn.",
      );
    }
  }, [
    clearPendingImage,
    draft,
    miniThread,
    pendingImage,
    viewerProfileId,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, miniOpen]);

  useEffect(() => {
    if (miniOpen) {
      inputRef.current?.focus();
    }
  }, [miniOpen]);

  if (open) {
    return (
      <div className="j-chat-dock-launcher-row">{launcher}</div>
    );
  }

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
                  className={`cins-chat-bubble${msg.from === "me" ? " is-me" : " is-them"}${msg.imageUrl || msg.imageId ? " has-image" : ""}`}
                >
                  <MiniChatMessageBody msg={msg} />
                  <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer className="j-chat-mini-compose">
            {pendingImage ? (
              <div className="j-chat-mini-compose-attach">
                <div className="j-chat-mini-compose-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImage.previewUrl} alt="" />
                  {pendingImage.uploading ? (
                    <span className="j-chat-mini-compose-preview-status">
                      Đang tải…
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="j-chat-mini-compose-remove"
                  aria-label="Bỏ ảnh đính kèm"
                  disabled={pendingImage.uploading}
                  onClick={clearPendingImage}
                >
                  <X size={12} strokeWidth={2.5} aria-hidden />
                </button>
                {pendingImage.error ? (
                  <p className="j-chat-mini-compose-error">{pendingImage.error}</p>
                ) : null}
              </div>
            ) : null}
            <div className="j-chat-mini-compose-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="j-chat-mini-compose-file"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addImageFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="j-chat-mini-attach"
                aria-label="Đính kèm ảnh"
                disabled={loadingMessages || pendingImage?.uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={17} strokeWidth={1.9} aria-hidden />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                disabled={loadingMessages}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Viết tin nhắn…"
                onPaste={handleComposePaste}
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
                disabled={!canSend}
                onClick={() => void sendMessage()}
              >
                <Send size={15} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          </footer>
        </section>
      ) : null}

      <div className="j-chat-dock-launcher-row">
        {peekThreads.length > 0 ? (
          <div
            className="j-chat-bubbles"
            role="status"
            aria-live="polite"
            aria-label={`${peekThreads.length} cuộc trò chuyện`}
          >
            {peekThreads.map((thread) => {
              const isActive =
                miniOpen && miniThread?.roomId === thread.roomId;
              const showCount = thread.unread > 0;
              const showDismiss =
                !showCount &&
                !isActive &&
                dismissableRooms.has(thread.roomId);

              return (
                <div
                  key={thread.roomId}
                  className={[
                    "j-chat-bubble-wrap",
                    isActive ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    className="j-chat-bubble-btn"
                    aria-label={
                      thread.unread > 0
                        ? `${thread.unread} tin nhắn chưa đọc từ ${thread.name}`
                        : `Mở chat với ${thread.name}`
                    }
                    aria-pressed={isActive}
                    title={thread.name}
                    onClick={() => openMini(thread)}
                  >
                    <MiniAvatar thread={thread} size={48} />
                  </button>
                  {showCount || showDismiss ? (
                    <button
                      type="button"
                      className={[
                        "j-chat-bubble-action",
                        showCount ? "is-count" : "is-dismiss",
                      ].join(" ")}
                      aria-label={
                        showCount
                          ? `${thread.unread} tin nhắn chưa đọc từ ${thread.name}`
                          : `Ẩn ${thread.name}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (showCount) {
                          openMini(thread);
                        } else {
                          dismissBubble(thread);
                        }
                      }}
                    >
                      {showCount ? (
                        thread.unread > 99 ? "99+" : thread.unread
                      ) : (
                        <X size={10} strokeWidth={2.5} aria-hidden />
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {launcher}
      </div>
    </>
  );
}
