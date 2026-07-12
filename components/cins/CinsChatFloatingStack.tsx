"use client";

import { Maximize2, Paperclip, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type ReactNode,
} from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
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
import { buildChatSendPlan, optimisticMessagesFromPlan, type ChatSendPayload } from "@/lib/chat/compose-send-plan";
import { executeComposeSendPlanInBackground } from "@/lib/chat/execute-compose-send-plan";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import { reconcileChatMessage, appendChatMessageIfNew, mergeChatMessageUpdate, type ChatRealtimeMessageEvent } from "@/lib/chat/realtime";
import { applyChatViewerPerspective } from "@/lib/chat/message-perspective";
import { applyKnownGroupSender } from "@/lib/chat/apply-known-group-sender";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import type { ChatMessage, ChatThread } from "@/lib/chat/types";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";

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
  pinnedRoomIds: ReadonlySet<string>,
  pinnedSnapshots: Record<string, ChatThread>,
): ChatThread[] {
  const apiByRoom = new Map(fromApi.map((t) => [t.roomId, t]));
  const merged = new Map<string, ChatThread>();
  const pinnedSet = pinnedRoomIds;

  const shouldKeep = (thread: ChatThread) => {
    const isPinned = pinnedSet.has(thread.roomId);
    const hasUnread = thread.unread > 0;
    if (!hasUnread && !isPinned) return false;
    if (dismissedKeys.has(peekKey(thread)) && !isPinned) return false;
    return true;
  };

  for (const thread of current) {
    const fresh = apiByRoom.get(thread.roomId) ?? thread;
    if (!shouldKeep(fresh)) continue;
    merged.set(thread.roomId, fresh);
  }

  for (const thread of pickUnreadThreads(fromApi)) {
    if (dismissedKeys.has(peekKey(thread))) continue;
    merged.set(thread.roomId, thread);
  }

  for (const roomId of pinnedSet) {
    const fromList = apiByRoom.get(roomId) ?? pinnedSnapshots[roomId];
    if (!fromList) continue;
    merged.set(roomId, fromList);
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

function MiniAvatar({
  thread,
  size = 36,
  initial,
  hue,
  avatarUrl,
}: {
  thread: ChatThread;
  size?: number;
  initial?: string;
  hue?: number;
  avatarUrl?: string | null;
}) {
  if (thread.isGroup) {
    return (
      <ChatGroupAvatar
        size={size}
        avatarUrl={avatarUrl !== undefined ? avatarUrl : thread.avatarUrl}
        members={thread.memberAvatars ?? []}
      />
    );
  }

  const resolvedInitial = initial ?? thread.avatarInitial;
  const resolvedHue = hue ?? thread.avatarHue;
  const resolvedUrl = avatarUrl !== undefined ? avatarUrl : thread.avatarUrl;

  return (
    <span
      className={`j-chat-mini-avatar${resolvedUrl ? " has-image" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: resolvedUrl ? "transparent" : avatarBg(resolvedHue),
      }}
      aria-hidden
    >
      {resolvedUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={resolvedUrl} alt="" />
      ) : (
        resolvedInitial
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
    pinnedRoomIds,
    pinnedThreadSnapshots,
  } = useCinsChat();
  const pinnedRoomIdSet = useMemo(
    () => new Set(pinnedRoomIds),
    [pinnedRoomIds],
  );
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
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
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
  const pendingFilesByLocalIdRef = useRef<Map<string, File>>(new Map());
  const inFlightUploadsRef = useRef<
    Map<string, Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>>
  >(new Map());
  /** roomId → optimistic album id — set đồng bộ khi gửi. */
  const pendingAlbumByRoomRef = useRef(new Map<string, string>());
  const miniOpenRef = useRef(false);
  const miniRoomIdRef = useRef<string | null>(null);
  const miniThreadRef = useRef<ChatThread | null>(null);

  pendingImagesRef.current = pendingImages;

  const activeRoomId = miniThread?.roomId ?? null;
  const activeRoomState = activeRoomId ? roomStates[activeRoomId] : null;
  const messages = activeRoomState?.messages ?? [];
  const hasMoreOlder = activeRoomState?.hasMore ?? false;

  miniOpenRef.current = miniOpen;
  miniRoomIdRef.current = miniThread?.roomId ?? null;
  miniThreadRef.current = miniThread;

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
    pendingFilesByLocalIdRef.current.delete(localId);
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
      const promise = fetchChatComposeImageUpload(file);
      inFlightUploadsRef.current.set(localId, promise);
      try {
        const result = await promise;
        applyUploadResultToRoom(roomId, localId, result);
      } finally {
        inFlightUploadsRef.current.delete(localId);
      }
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
        pendingFilesByLocalIdRef.current.set(draft.localId, file);
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
          pinnedRoomIdSet,
          pinnedThreadSnapshots,
        ),
      );
    } catch {
      /* ignore */
    }
  }, [open, pinnedRoomIdSet, pinnedThreadSnapshots, prefetchChatData, viewerProfileId]);

  const applyPeekFromThreads = useCallback(
    (threads: ChatThread[]) => {
      if (open) return;
      setPeekThreads((prev) =>
        mergePeekThreads(
          prev,
          threads,
          dismissedPeekRef.current,
          pinnedRoomIdSet,
          pinnedThreadSnapshots,
        ),
      );
    },
    [open, pinnedRoomIdSet, pinnedThreadSnapshots],
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
        mergePeekThreads(
          prev,
          cached.threads,
          dismissedPeekRef.current,
          pinnedRoomIdSet,
          pinnedThreadSnapshots,
        ),
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
  }, [
    getCachedThreads,
    open,
    pinnedRoomIdSet,
    pinnedThreadSnapshots,
    setTotalUnread,
    syncThreads,
  ]);

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

      const message = applyChatViewerPerspective(
        [event.message],
        viewerProfileId,
      )[0]!;

      if (miniOpenRef.current && miniRoomIdRef.current === event.roomId) {
        const enriched = miniThreadRef.current?.isGroup
          ? applyKnownGroupSender(message, miniThreadRef.current.memberAvatars)
          : message;
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
                  ? mergeChatMessageUpdate(current.messages, enriched)
                  : appendChatMessageIfNew(current.messages, enriched, {
                      pendingAlbumOptimisticId:
                        pendingAlbumByRoomRef.current.get(event.roomId) ?? null,
                    }),
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

        if (message.from === "them") {
          void fetch(`/api/chat/rooms/${event.roomId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_tin_nhan_cuoi: message.id }),
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
          messages: applyChatViewerPerspective(cached, viewerProfileId),
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

        const messages = applyChatViewerPerspective(
          page.messages,
          viewerProfileId,
        );
        hydratedRoomsRef.current.add(roomId);
        patchRoomState(roomId, {
          messages,
          hasMore: page.hasMore,
          hydrated: true,
        });
        if (viewerProfileId) {
          writeRoomMessagesCache(viewerProfileId, roomId, messages);
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
              pinnedRoomIdSet,
              pinnedThreadSnapshots,
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
      pinnedRoomIdSet,
      pinnedThreadSnapshots,
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
      setStickerPickerOpen(false);
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
        setStickerPickerOpen(false);
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
    setStickerPickerOpen(false);
    setLoadError(null);
    void syncThreads();
  }, [markRoomDismissable, miniThread?.roomId, saveComposeForRoom, syncThreads]);

  const sendableImages = pendingImages.filter((image) => !image.error);

  const canSend =
    Boolean(miniThread) &&
    (draft.trim().length > 0 || sendableImages.length > 0);

  const appendOptimisticMessages = useCallback(
    (roomId: string, optimistics: ChatMessage[]) => {
      if (optimistics.length === 0) return;
      const last = optimistics[optimistics.length - 1]!;
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
            messages: [...current.messages, ...optimistics],
          },
        };
      });

      setMiniThread((prev) =>
        prev && prev.roomId === roomId
          ? {
              ...prev,
              preview: messagePreviewText(last),
              lastAt: last.sentAt,
            }
          : prev,
      );

      if (shouldScrollToBottomRef.current) {
        requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
      }
    },
    [scrollMessagesToBottom],
  );

  const submitRoomMessage = useCallback(
    async (roomId: string, payload: ChatSendPayload, optimisticId: string) => {
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
              messages: current.messages.filter((m) => m.id !== optimisticId),
            },
          };
        });
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được tin nhắn.",
        );
        return false;
      }
    },
    [viewerProfileId],
  );

  const submitAlbumBatch = useCallback(
    async (
      roomId: string,
      albumOptimisticId: string,
      payloads: ChatSendPayload[],
    ) => {
      const realMessages: ChatMessage[] = [];
      try {
        for (const payload of payloads) {
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
            throw new Error(json.error ?? "Không gửi được ảnh.");
          }
          realMessages.push(json.message);
        }

        setRoomStates((prev) => {
          const current = prev[roomId] ?? {
            messages: [],
            hasMore: false,
            hydrated: true,
          };
          const messages = replaceOptimisticAlbumWithRealMessages(
            current.messages,
            albumOptimisticId,
            realMessages,
          );
          if (viewerProfileId) {
            writeRoomMessagesCache(viewerProfileId, roomId, messages);
          }
          return {
            ...prev,
            [roomId]: { ...current, messages },
          };
        });

        const last = realMessages[realMessages.length - 1]!;
        setMiniThread((prev) =>
          prev && prev.roomId === roomId
            ? {
                ...prev,
                preview: messagePreviewText(last),
                lastAt: last.sentAt,
              }
            : prev,
        );
        pendingAlbumByRoomRef.current.delete(roomId);
        return true;
      } catch (error) {
        pendingAlbumByRoomRef.current.delete(roomId);
        setRoomStates((prev) => {
          const current = prev[roomId];
          if (!current) return prev;
          return {
            ...prev,
            [roomId]: {
              ...current,
              messages: current.messages.filter((m) => m.id !== albumOptimisticId),
            },
          };
        });
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được ảnh.",
        );
        return false;
      }
    },
    [viewerProfileId],
  );

  const sendSticker = useCallback(
    async (item: UserEmojiMuc) => {
      if (!miniThread) return;
      const roomId = miniThread.roomId;
      setLoadError(null);
      shouldScrollToBottomRef.current = true;
      const optimistic = createOptimisticChatMessage({
        body: "",
        kind: "sticker",
        imageId: item.cloudflareId,
        imageUrl:
          item.url ?? userEmojiDeliveryUrl(item.cloudflareId, "thumbnail"),
      });
      appendOptimisticMessages(roomId, [optimistic]);
      await submitRoomMessage(
        roomId,
        { id_emoji_muc: item.id },
        optimistic.id,
      );
    },
    [appendOptimisticMessages, miniThread, submitRoomMessage],
  );

  const sendMessage = useCallback(() => {
    if (!miniThread || !canSend) return;

    const text = draft.trim();
    const snapshotText = draft;
    const snapshotImages = sendableImages;
    const roomId = miniThread.roomId;

    const plan = buildChatSendPlan({
      text,
      images: snapshotImages.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
    });
    const optimistics = optimisticMessagesFromPlan(plan);
    if (optimistics.length === 0) return;

    setLoadError(null);
    shouldScrollToBottomRef.current = true;

    appendOptimisticMessages(roomId, optimistics);

    setDraft("");
    setPendingImages([]);
    pendingImagesRef.current = [];
    composeByRoomRef.current.set(roomId, { text: "", images: [] });
    inputRef.current?.focus();

    const optimisticIds = new Set(optimistics.map((item) => item.id));

    if (plan.album) {
      pendingAlbumByRoomRef.current.set(roomId, plan.album.optimistic.id);
    }

    void executeComposeSendPlanInBackground({
      plan,
      imageSnapshots: snapshotImages,
      filesByLocalId: pendingFilesByLocalIdRef.current,
      inFlightUploads: inFlightUploadsRef.current,
      hasText: Boolean(text),
      replyToId: null,
      sendText: plan.text
        ? () => submitRoomMessage(roomId, plan.text!.payload, plan.text!.optimistic.id)
        : undefined,
      sendAlbum: plan.album
        ? (payloads) => submitAlbumBatch(roomId, plan.album!.optimistic.id, payloads)
        : undefined,
      onFailure: () => {
        pendingAlbumByRoomRef.current.delete(roomId);
        setLoadError("Không gửi được tin nhắn. Hãy thử lại.");
        setRoomStates((prev) => {
          const current = prev[roomId];
          if (!current) return prev;
          return {
            ...prev,
            [roomId]: {
              ...current,
              messages: current.messages.filter((m) => !optimisticIds.has(m.id)),
            },
          };
        });
        setDraft(snapshotText);
        setPendingImages(snapshotImages);
        pendingImagesRef.current = snapshotImages;
        composeByRoomRef.current.set(roomId, {
          text: snapshotText,
          images: snapshotImages,
        });
      },
      onFinally: () => {
        for (const image of snapshotImages) {
          pendingFilesByLocalIdRef.current.delete(image.localId);
        }
      },
    }).then((ok) => {
      if (ok) revokeDraftImageUrls(snapshotImages);
    });
  }, [
    appendOptimisticMessages,
    canSend,
    draft,
    miniThread,
    sendableImages,
    submitAlbumBatch,
    submitRoomMessage,
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
                showSenderNames={Boolean(miniThread.isGroup)}
                renderTheirAvatar={(msg) => (
                  <MiniAvatar
                    thread={miniThread}
                    size={miniThread.isGroup ? 28 : 26}
                    initial={
                      miniThread.isGroup && msg.senderAvatarInitial
                        ? msg.senderAvatarInitial
                        : undefined
                    }
                    hue={
                      miniThread.isGroup && msg.senderAvatarHue != null
                        ? msg.senderAvatarHue
                        : undefined
                    }
                    avatarUrl={
                      miniThread.isGroup
                        ? (msg.senderAvatarUrl ?? null)
                        : undefined
                    }
                  />
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
                      <button
                        type="button"
                        className="j-chat-mini-compose-remove"
                        aria-label="Bỏ ảnh đính kèm"
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
            {stickerPickerOpen ? (
              <ChatStickerPicker
                onClose={() => setStickerPickerOpen(false)}
                onSend={(item) => {
                  setStickerPickerOpen(false);
                  void sendSticker(item);
                }}
              />
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
                className="cins-chat-attach cins-chat-attach-meme"
                data-sticker-trigger
                aria-label="Meme của tôi"
                aria-expanded={stickerPickerOpen}
                onClick={() => setStickerPickerOpen((open) => !open)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="cins-chat-attach-meme-icon"
                  src="/assets/chat-meme-trigger.png"
                  alt=""
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className="j-chat-mini-attach"
                aria-label="Đính kèm ảnh"
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
              const isPinned = pinnedRoomIdSet.has(thread.roomId);
              const showCount = thread.unread > 0;
              const showDismiss =
                !showCount &&
                !isActive &&
                !isPinned &&
                dismissableRooms.has(thread.roomId);

              return (
                <div
                  key={thread.roomId}
                  className={[
                    "j-chat-bubble-wrap",
                    isActive ? "is-active" : "",
                    isPinned ? "is-pinned" : "",
                    thread.isGroup ? "is-group" : "",
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
                        : isPinned
                          ? `Chat đã ghim với ${thread.name}`
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
