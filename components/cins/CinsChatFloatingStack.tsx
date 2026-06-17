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
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { avatarBg } from "@/lib/chat/avatar";
import { writeChatThreadsCache, writeRoomMessagesCache } from "@/lib/chat/chat-session-cache";
import {
  revokeDraftImageUrls,
  type PendingImageDraft,
  type RoomComposeDraft,
} from "@/lib/chat/compose-draft";
import {
  fetchChatComposeImageUpload,
  normalizeRestoredComposeImages,
  patchPendingImageUploadResult,
  planPendingImageAdditions,
} from "@/lib/chat/compose-image-upload";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import { reconcileChatMessage, appendChatMessageIfNew, mergeChatMessageUpdate, type ChatRealtimeMessageEvent } from "@/lib/chat/realtime";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";

const RECONCILE_MS = 120_000;

type RoomChatState = {
  messages: ChatMessage[];
  hasMore: boolean;
  hydrated: boolean;
};

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
  } = useCinsChat();
  const [peekThreads, setPeekThreads] = useState<ChatThread[]>([]);
  const [dismissableRooms, setDismissableRooms] = useState<Set<string>>(
    () => new Set(),
  );
  const [miniThread, setMiniThread] = useState<ChatThread | null>(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [roomStates, setRoomStates] = useState<Record<string, RoomChatState>>({});
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dismissedPeekRef = useRef<Set<string>>(new Set());
  const viewedRoomsRef = useRef<Set<string>>(new Set());
  const hydratedRoomsRef = useRef<Set<string>>(new Set());
  const composeByRoomRef = useRef<Map<string, RoomComposeDraft>>(new Map());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImageDraft[]>([]);
  const miniOpenRef = useRef(false);
  const miniRoomIdRef = useRef<string | null>(null);

  pendingImagesRef.current = pendingImages;

  const activeRoomId = miniThread?.roomId ?? null;
  const activeRoomState = activeRoomId ? roomStates[activeRoomId] : null;
  const messages = activeRoomState?.messages ?? [];
  const hasMoreOlder = activeRoomState?.hasMore ?? false;

  miniOpenRef.current = miniOpen;
  miniRoomIdRef.current = miniThread?.roomId ?? null;

  useEffect(() => {
    return () => {
      revokeDraftImageUrls(pendingImagesRef.current);
    };
  }, []);

  const patchRoomState = useCallback(
    (roomId: string, patch: Partial<RoomChatState>) => {
      setRoomStates((prev) => {
        const current = prev[roomId] ?? {
          messages: [],
          hasMore: false,
          hydrated: false,
        };
        return {
          ...prev,
          [roomId]: { ...current, ...patch },
        };
      });
    },
    [],
  );

  const saveComposeForRoom = useCallback(
    (roomId: string) => {
      composeByRoomRef.current.set(roomId, {
        text: draft,
        images: pendingImages,
      });
    },
    [draft, pendingImages],
  );

  const restoreComposeForRoom = useCallback((roomId: string) => {
    const saved = composeByRoomRef.current.get(roomId);
    setDraft(saved?.text ?? "");
    setPendingImages(normalizeRestoredComposeImages(saved?.images ?? []));
  }, []);

  const applyUploadResultToRoom = useCallback(
    (roomId: string | null, localId: string, result: Awaited<ReturnType<typeof fetchChatComposeImageUpload>>) => {
      if (roomId) {
        const saved = composeByRoomRef.current.get(roomId);
        if (saved?.images.some((item) => item.localId === localId)) {
          composeByRoomRef.current.set(roomId, {
            ...saved,
            images: patchPendingImageUploadResult(saved.images, localId, result),
          });
        }
      }

      if (miniRoomIdRef.current !== roomId) return;

      setPendingImages((prev) => {
        if (!prev.some((item) => item.localId === localId)) return prev;
        return patchPendingImageUploadResult(prev, localId, result);
      });
    },
    [],
  );

  const clearPendingImages = useCallback(() => {
    setPendingImages((prev) => {
      revokeDraftImageUrls(prev);
      return [];
    });
  }, []);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (behavior === "auto") {
      el.scrollTop = el.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);
  const scrollMessagesToBottomRef = useRef(scrollMessagesToBottom);
  scrollMessagesToBottomRef.current = scrollMessagesToBottom;

  const removePendingImage = useCallback((localId: string) => {
    setPendingImages((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  }, []);

  const uploadPendingImage = useCallback(
    async (file: File, localId: string, roomId: string | null) => {
      const result = await fetchChatComposeImageUpload(file);
      applyUploadResultToRoom(roomId, localId, result);
    },
    [applyUploadResultToRoom],
  );

  const addImageFiles = useCallback(
    (files: File[]) => {
      const roomId = miniRoomIdRef.current;
      const planned = planPendingImageAdditions(files, pendingImagesRef.current);
      if (planned.length === 0) return;

      setPendingImages((prev) => [...prev, ...planned.map((item) => item.draft)]);

      for (const { file, draft } of planned) {
        void uploadPendingImage(file, draft.localId, roomId);
      }
    },
    [uploadPendingImage],
  );

  const handleComposePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = imageFilesFromClipboard(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      addImageFiles(files);
    },
    [addImageFiles],
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
        setRoomStates((prev) => {
          const current = prev[event.roomId] ?? {
            messages: [],
            hasMore: false,
            hydrated: true,
          };
          return {
            ...prev,
            [event.roomId]: {
              ...current,
              messages:
                event.event === "update"
                  ? mergeChatMessageUpdate(current.messages, event.message)
                  : appendChatMessageIfNew(current.messages, event.message),
            },
          };
        });
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

        const container = messagesContainerRef.current;
        const nearBottom = container
          ? container.scrollHeight - container.scrollTop - container.clientHeight < 80
          : true;
        if (nearBottom) {
          shouldScrollToBottomRef.current = true;
          requestAnimationFrame(() =>
            scrollMessagesToBottomRef.current("smooth"),
          );
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

  const loadRecentMessages = useCallback(
    async (thread: ChatThread) => {
      const { roomId } = thread;
      if (hydratedRoomsRef.current.has(roomId)) return;

      const cached = getCachedRoomMessages(roomId);
      if (cached?.length) {
        patchRoomState(roomId, {
          messages: cached,
          hasMore: true,
          hydrated: true,
        });
        hydratedRoomsRef.current.add(roomId);
        setLoadingMessages(false);
      } else {
        setLoadingMessages(true);
      }
      setLoadError(null);

      try {
        const page = await fetchRoomMessagesPage(roomId);
        if (!page) {
          if (!cached?.length) {
            throw new Error("Không tải được tin nhắn.");
          }
          return;
        }

        hydratedRoomsRef.current.add(roomId);
        patchRoomState(roomId, {
          messages: page.messages,
          hasMore: page.hasMore,
          hydrated: true,
        });
        if (viewerProfileId) {
          writeRoomMessagesCache(viewerProfileId, roomId, page.messages);
        }
        viewedRoomsRef.current.add(roomId);

        const lastId = page.messages.at(-1)?.id;
        if (lastId) {
          void fetch(`/api/chat/rooms/${roomId}/read`, {
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
            ).map((t) => (t.roomId === roomId ? { ...t, unread: 0 } : t)),
          );
        }
      } catch (error) {
        if (!cached?.length) {
          setLoadError(
            error instanceof Error ? error.message : "Không tải được tin nhắn.",
          );
        }
      } finally {
        setLoadingMessages(false);
        if (miniRoomIdRef.current === roomId && shouldScrollToBottomRef.current) {
          requestAnimationFrame(() => scrollMessagesToBottom("auto"));
        }
      }
    },
    [
      getCachedRoomMessages,
      patchRoomState,
      prefetchChatData,
      scrollMessagesToBottom,
      viewerProfileId,
    ],
  );

  const loadOlderMessages = useCallback(
    async (roomId: string) => {
      const state = roomStates[roomId];
      if (!state?.hasMore || loadingOlder) return;

      const before = state.messages[0]?.id;
      if (!before) return;

      const container = messagesContainerRef.current;
      const prevHeight = container?.scrollHeight ?? 0;

      setLoadingOlder(true);
      shouldScrollToBottomRef.current = false;
      try {
        const page = await fetchRoomMessagesPage(roomId, { before });
        if (!page) return;

        patchRoomState(roomId, {
          messages: [...page.messages, ...state.messages],
          hasMore: page.hasMore,
        });

        requestAnimationFrame(() => {
          const el = messagesContainerRef.current;
          if (!el) return;
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      } finally {
        setLoadingOlder(false);
      }
    },
    [loadingOlder, patchRoomState, roomStates],
  );

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || !activeRoomId || loadingOlder || !hasMoreOlder) return;
    if (el.scrollTop > 72) return;
    void loadOlderMessages(activeRoomId);
  }, [activeRoomId, hasMoreOlder, loadOlderMessages, loadingOlder]);

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

      if (switching && miniThread) {
        saveComposeForRoom(miniThread.roomId);
        markRoomDismissable(miniThread.roomId);
      }

      setMiniThread(thread);
      setMiniOpen(true);
      restoreComposeForRoom(thread.roomId);
      setLoadError(null);
      shouldScrollToBottomRef.current = true;

      if (!hydratedRoomsRef.current.has(thread.roomId)) {
        void loadRecentMessages(thread);
      } else {
        requestAnimationFrame(() => scrollMessagesToBottom("auto"));
      }
    },
    [
      loadRecentMessages,
      markRoomDismissable,
      miniOpen,
      miniThread,
      restoreComposeForRoom,
      saveComposeForRoom,
      scrollMessagesToBottom,
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
        saveComposeForRoom(thread.roomId);
        setMiniOpen(false);
        setMiniThread(null);
        setLoadError(null);
      }
    },
    [miniThread?.roomId, saveComposeForRoom],
  );

  const closeMini = useCallback(() => {
    const roomId = miniThread?.roomId;
    if (roomId) {
      saveComposeForRoom(roomId);
      markRoomDismissable(roomId);
    }
    setMiniOpen(false);
    setMiniThread(null);
    setLoadError(null);
    void syncThreads();
  }, [markRoomDismissable, miniThread?.roomId, saveComposeForRoom, syncThreads]);

  const readyImages = pendingImages.filter(
    (image) => image.imageId && !image.uploading,
  );
  const isUploadingImages = pendingImages.some((image) => image.uploading);

  const canSend =
    Boolean(miniThread) &&
    !isUploadingImages &&
    (draft.trim().length > 0 || readyImages.length > 0);

  const postRoomMessage = useCallback(
    async (
      roomId: string,
      payload: { noi_dung?: string; cloudflare_image_id?: string },
      optimistic: ChatMessage,
    ) => {
      setRoomStates((prev) => {
        const current = prev[roomId] ?? {
          messages: [],
          hasMore: false,
          hydrated: true,
        };
        return {
          ...prev,
          [roomId]: {
            ...current,
            messages: [...current.messages, optimistic],
          },
        };
      });

      if (shouldScrollToBottomRef.current) {
        requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
      }

      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          message?: ChatMessage;
          error?: string;
        };
        if (!res.ok || !json.message) {
          throw new Error(json.error ?? "Không gửi được tin nhắn.");
        }

        setRoomStates((prev) => {
          const current = prev[roomId] ?? {
            messages: [],
            hasMore: false,
            hydrated: true,
          };
          const nextMessages = reconcileChatMessage(
            current.messages,
            json.message!,
          );
          if (viewerProfileId) {
            writeRoomMessagesCache(viewerProfileId, roomId, nextMessages);
          }
          return {
            ...prev,
            [roomId]: { ...current, messages: nextMessages },
          };
        });

        setMiniThread((prev) =>
          prev && prev.roomId === roomId
            ? {
                ...prev,
                preview: messagePreviewText(json.message!),
                lastAt: json.message!.sentAt,
              }
            : prev,
        );

        return true;
      } catch (error) {
        setRoomStates((prev) => {
          const current = prev[roomId];
          if (!current) return prev;
          return {
            ...prev,
            [roomId]: {
              ...current,
              messages: current.messages.filter((m) => m.id !== optimistic.id),
            },
          };
        });
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được tin nhắn.",
        );
        return false;
      }
    },
    [scrollMessagesToBottom, viewerProfileId],
  );

  const sendMessage = useCallback(async () => {
    if (!miniThread || !canSend) return;

    const text = draft.trim();
    const images = readyImages;

    const sends: Array<{
      payload: { noi_dung?: string; cloudflare_image_id?: string };
      optimistic: ChatMessage;
    }> = [];

    if (images.length > 0) {
      const [first, ...rest] = images;
      sends.push({
        payload: {
          ...(text ? { noi_dung: text } : {}),
          cloudflare_image_id: first.imageId!,
        },
        optimistic: createOptimisticChatMessage({
          body: text,
          imageId: first.imageId,
          imageUrl: first.previewUrl,
        }),
      });
      for (const image of rest) {
        sends.push({
          payload: { cloudflare_image_id: image.imageId! },
          optimistic: createOptimisticChatMessage({
            body: "",
            imageId: image.imageId,
            imageUrl: image.previewUrl,
          }),
        });
      }
    } else if (text) {
      sends.push({
        payload: { noi_dung: text },
        optimistic: createOptimisticChatMessage({ body: text }),
      });
    }

    setLoadError(null);
    shouldScrollToBottomRef.current = true;

    for (const item of sends) {
      const ok = await postRoomMessage(miniThread.roomId, item.payload, item.optimistic);
      if (!ok) return;
    }

    setDraft("");
    clearPendingImages();
    composeByRoomRef.current.set(miniThread.roomId, { text: "", images: [] });
    inputRef.current?.focus();
  }, [
    canSend,
    clearPendingImages,
    draft,
    miniThread,
    postRoomMessage,
    readyImages,
  ]);

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

          <div
            className="j-chat-mini-messages"
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            {loadingOlder ? (
              <p className="j-chat-mini-empty j-chat-mini-load-more">
                Đang tải tin cũ hơn…
              </p>
            ) : null}
            {loadingMessages && messages.length === 0 ? (
              <p className="j-chat-mini-empty">Đang tải tin nhắn…</p>
            ) : loadError && messages.length === 0 ? (
              <p className="j-chat-mini-empty">{loadError}</p>
            ) : messages.length === 0 ? (
              <p className="j-chat-mini-empty">
                Bắt đầu trò chuyện với <strong>{miniThread.name}</strong>
              </p>
            ) : null}
            {messages.length > 0 ? (
              <ChatMessageThreadItems
                messages={messages}
                renderTheirAvatar={() => (
                  <MiniAvatar thread={miniThread} size={26} />
                )}
              />
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <footer className="j-chat-mini-compose">
            {pendingImages.length > 0 ? (
              <div className="j-chat-mini-compose-attach-list">
                {pendingImages.map((image) => (
                  <div key={image.localId} className="j-chat-mini-compose-attach">
                    <div className="j-chat-mini-compose-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.previewUrl} alt="" />
                      {image.uploading ? (
                        <span className="j-chat-mini-compose-preview-status">
                          Đang tải…
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="j-chat-mini-compose-remove"
                        aria-label="Bỏ ảnh đính kèm"
                        disabled={image.uploading}
                        onClick={() => removePendingImage(image.localId)}
                      >
                        <X size={12} strokeWidth={2.5} aria-hidden />
                      </button>
                      {image.error ? (
                        <p className="j-chat-mini-compose-error">{image.error}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {loadError && messages.length > 0 ? (
              <p className="j-chat-mini-compose-send-error" role="alert">
                {loadError}
              </p>
            ) : null}
            <div className="j-chat-mini-compose-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="j-chat-mini-compose-file"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  if (files.length > 0) addImageFiles(files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="j-chat-mini-attach"
                aria-label="Đính kèm ảnh"
                disabled={isUploadingImages}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={17} strokeWidth={1.9} aria-hidden />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
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
