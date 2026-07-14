"use client";

import { Maximize2, Paperclip, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { avatarBg, avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
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
  patchChatMessage,
  toggleChatReaction,
} from "@/lib/chat/message-actions-client";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import { applyOptimisticReaction } from "@/lib/chat/optimistic-reactions";
import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import { updateMessageInList } from "@/lib/chat/patch-thread-messages";
import {
  patchChatReadCursorMessage,
  upsertChatReadCursor,
} from "@/lib/chat/read-cursors-client";
import { useChatReadCursorsRealtime } from "@/lib/chat/use-chat-read-cursors-realtime";
import { reconcileChatMessage, appendChatMessageIfNew, mergeChatMessageUpdate, type ChatRealtimeMessageEvent } from "@/lib/chat/realtime";
import { applyChatViewerPerspective } from "@/lib/chat/message-perspective";
import { applyKnownGroupSender } from "@/lib/chat/apply-known-group-sender";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import type {
  ChatMessage,
  ChatMessageReplyPreview,
  ChatReadCursor,
  ChatThread,
} from "@/lib/chat/types";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";

function messageToReplyPreview(msg: ChatMessage): ChatMessageReplyPreview {
  return {
    id: msg.id,
    from: msg.from,
    body: msg.body,
    kind: msg.kind,
    imageUrl: msg.imageUrl,
    deleted: msg.deleted,
  };
}

const RECONCILE_MS = 120_000;

type RoomChatState = {
  messages: ChatMessage[];
  hasMore: boolean;
  hydrated: boolean;
  readCursors?: ChatReadCursor[];
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
  parentThread = null,
  variant = "thread",
}: {
  thread: ChatThread;
  size?: number;
  initial?: string;
  hue?: number;
  avatarUrl?: string | null;
  /** Nhóm cha — hiện badge góc phải dưới (project con). */
  parentThread?: ChatThread | null;
  /** `person` = avatar người gửi (bỏ qua mosaic nhóm). */
  variant?: "thread" | "person";
}) {
  if (variant === "person") {
    const resolvedInitial = initial ?? thread.avatarInitial;
    const resolvedHue = hue ?? thread.avatarHue;
    const resolvedUrl =
      avatarUrl !== undefined ? avatarUrl : thread.avatarUrl;
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

  /* Project con: dấu # (hoặc thumb) + badge avatar nhóm cha. */
  if (thread.parentRoomId) {
    const thumbUrl =
      avatarUrl !== undefined ? avatarUrl : thread.avatarUrl;
    return (
      <span
        className="j-chat-project-mark-avatar"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {thumbUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="j-chat-project-mark-thumb" src={thumbUrl} alt="" />
        ) : (
          <span className="j-chat-project-mark-hash">#</span>
        )}
        {parentThread ? (
          <span className="j-chat-project-mark-parent">
            <ChatGroupAvatar
              size={20}
              avatarUrl={parentThread.avatarUrl}
              members={parentThread.memberAvatars ?? []}
            />
          </span>
        ) : null}
      </span>
    );
  }

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
    pendingBubbleThread,
    clearPendingBubble,
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
  const [miniLeaving, setMiniLeaving] = useState(false);
  const [clickFx, setClickFx] = useState<{
    id: number;
    roomId: string;
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const clickFxIdRef = useRef(0);
  const [roomStates, setRoomStates] = useState<Record<string, RoomChatState>>({});
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
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
  const miniLeavingRef = useRef(false);
  const miniPanelRef = useRef<HTMLElement>(null);
  const dockControlsRef = useRef<HTMLDivElement>(null);

  pendingImagesRef.current = pendingImages;

  const activeRoomId = miniThread?.roomId ?? null;
  const activeRoomState = activeRoomId ? roomStates[activeRoomId] : null;
  const messages = activeRoomState?.messages ?? [];
  const readCursors = activeRoomState?.readCursors ?? [];
  const hasMoreOlder = activeRoomState?.hasMore ?? false;

  miniOpenRef.current = miniOpen;
  miniRoomIdRef.current = miniThread?.roomId ?? null;
  miniThreadRef.current = miniThread;

  const threadByRoomId = useMemo(() => {
    const map = new Map<string, ChatThread>();
    const cached = getCachedThreads();
    if (cached) {
      for (const thread of cached.threads) {
        map.set(thread.roomId, thread);
      }
    }
    for (const thread of Object.values(pinnedThreadSnapshots)) {
      map.set(thread.roomId, thread);
    }
    for (const thread of peekThreads) {
      map.set(thread.roomId, thread);
    }
    return map;
  }, [getCachedThreads, peekThreads, pinnedThreadSnapshots]);

  const resolveParentThread = useCallback(
    (thread: ChatThread): ChatThread | null => {
      const parentId = thread.parentRoomId?.trim();
      if (!parentId) return null;
      return threadByRoomId.get(parentId) ?? null;
    },
    [threadByRoomId],
  );

  const handleReadCursorRealtime = useCallback(
    (row: {
      id_phong: string;
      id_nguoi_dung: string;
      id_tin_nhan_cuoi_doc: string | null;
    }) => {
      const roomId = row.id_phong;
      const messageId = row.id_tin_nhan_cuoi_doc?.trim();
      if (!messageId) return;

      setRoomStates((prev) => {
        const current = prev[roomId];
        const cursors = current?.readCursors ?? [];
        const patched = patchChatReadCursorMessage(
          cursors,
          row.id_nguoi_dung,
          messageId,
        );
        if (patched) {
          return {
            ...prev,
            [roomId]: {
              messages: current?.messages ?? [],
              hasMore: current?.hasMore ?? false,
              hydrated: current?.hydrated ?? true,
              readCursors: patched,
            },
          };
        }

        const thread = miniThreadRef.current;
        const member = thread?.memberAvatars?.find(
          (m) => m.userId === row.id_nguoi_dung,
        );
        const name =
          member?.name?.trim() ||
          (thread &&
          !thread.isGroup &&
          thread.peerUserId === row.id_nguoi_dung
            ? thread.name
            : null) ||
          "Thành viên";
        const nextCursor: ChatReadCursor = {
          userId: row.id_nguoi_dung,
          messageId,
          name,
          slug: member?.slug,
          avatarUrl:
            member?.avatarUrl ??
            (thread &&
            !thread.isGroup &&
            thread.peerUserId === row.id_nguoi_dung
              ? thread.avatarUrl
              : null),
          initial: member?.initial ?? avatarInitialFromName(name),
          hue: member?.hue ?? avatarHueFromSeed(row.id_nguoi_dung),
        };
        return {
          ...prev,
          [roomId]: {
            messages: current?.messages ?? [],
            hasMore: current?.hasMore ?? false,
            hydrated: current?.hydrated ?? true,
            readCursors: upsertChatReadCursor(cursors, nextCursor),
          },
        };
      });
    },
    [],
  );

  useChatReadCursorsRealtime(
    miniOpen ? activeRoomId : null,
    viewerProfileId,
    handleReadCursorRealtime,
  );
  miniLeavingRef.current = miniLeaving;

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

  const patchActiveRoomMessages = useCallback(
    (roomId: string, updater: (messages: ChatMessage[]) => ChatMessage[]) => {
      setRoomStates((prev) => {
        const current = prev[roomId];
        if (!current) return prev;
        const messages = updater(current.messages);
        if (viewerProfileId) {
          writeRoomMessagesCache(viewerProfileId, roomId, messages);
        }
        return {
          ...prev,
          [roomId]: { ...current, messages },
        };
      });
    },
    [viewerProfileId],
  );

  const clearMessageChrome = useCallback(() => {
    setReplyTarget(null);
    setEditingMessageId(null);
    setEditingDraft("");
  }, []);

  const messageActionHandlers = useMemo<ChatMessageActionHandlers>(
    () => ({
      onReply: (msg) => {
        setReplyTarget(msg);
        setEditingMessageId(null);
        setEditingDraft("");
        inputRef.current?.focus();
      },
      onRecall: (msg) => {
        const roomId = miniRoomIdRef.current;
        if (!roomId) return;
        const snapshot = { ...msg };
        patchActiveRoomMessages(roomId, (msgs) =>
          updateMessageInList(msgs, msg.id, { deleted: true, body: "" }),
        );
        void patchChatMessage(roomId, msg.id, { action: "recall" }).then((res) => {
          if (res.error) {
            patchActiveRoomMessages(roomId, (msgs) =>
              updateMessageInList(msgs, msg.id, snapshot),
            );
            setLoadError(res.error);
            return;
          }
          if (res.message) {
            patchActiveRoomMessages(roomId, (msgs) =>
              msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
            );
          }
        });
      },
      onEdit: (msg) => {
        setEditingMessageId(msg.id);
        setEditingDraft(msg.body);
        setReplyTarget(null);
      },
      onPin: (msg, pinned) => {
        const roomId = miniRoomIdRef.current;
        if (!roomId) return;
        patchActiveRoomMessages(roomId, (msgs) =>
          updateMessageInList(msgs, msg.id, { pinned }),
        );
        void patchChatMessage(roomId, msg.id, { action: "pin", pinned }).then((res) => {
          if (res.error) {
            patchActiveRoomMessages(roomId, (msgs) =>
              updateMessageInList(msgs, msg.id, { pinned: !pinned }),
            );
            setLoadError(res.error);
            return;
          }
          if (res.message) {
            patchActiveRoomMessages(roomId, (msgs) =>
              msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
            );
          }
        });
      },
      onReaction: (msg, emoji, activeReaction) => {
        const roomId = miniRoomIdRef.current;
        if (!roomId) return;
        const prevReactions = msg.reactions;
        const nextReactions = applyOptimisticReaction(
          msg.reactions,
          emoji,
          activeReaction,
        );
        patchActiveRoomMessages(roomId, (msgs) =>
          updateMessageInList(msgs, msg.id, { reactions: nextReactions }),
        );
        void toggleChatReaction(roomId, msg.id, emoji, activeReaction).then((res) => {
          if (res.error) {
            patchActiveRoomMessages(roomId, (msgs) =>
              updateMessageInList(msgs, msg.id, { reactions: prevReactions }),
            );
            setLoadError(res.error);
            return;
          }
          if (res.reactions) {
            patchActiveRoomMessages(roomId, (msgs) =>
              updateMessageInList(msgs, msg.id, { reactions: res.reactions }),
            );
          }
        });
      },
    }),
    [patchActiveRoomMessages],
  );

  const handleSaveEdit = useCallback(
    (msg: ChatMessage) => {
      const roomId = miniRoomIdRef.current;
      if (!roomId) return;
      const body = editingDraft.trim();
      if (!body || body === msg.body) {
        setEditingMessageId(null);
        setEditingDraft("");
        return;
      }
      const snapshot = {
        body: msg.body,
        edited: msg.edited,
        editedAt: msg.editedAt,
      };
      const now = new Date().toISOString();
      patchActiveRoomMessages(roomId, (msgs) =>
        updateMessageInList(msgs, msg.id, {
          body,
          edited: true,
          editedAt: now,
        }),
      );
      setEditingMessageId(null);
      setEditingDraft("");
      void patchChatMessage(roomId, msg.id, {
        action: "edit",
        noi_dung: body,
      }).then((res) => {
        if (res.error) {
          patchActiveRoomMessages(roomId, (msgs) =>
            updateMessageInList(msgs, msg.id, snapshot),
          );
          setLoadError(res.error);
          return;
        }
        if (res.message) {
          patchActiveRoomMessages(roomId, (msgs) =>
            msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
          );
        }
      });
    },
    [editingDraft, patchActiveRoomMessages],
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
      /* Một lần nữa sau layout — ảnh/sticker có thể đẩy chiều cao. */
      el.scrollTop = el.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);
  const scrollMessagesToBottomRef = useRef(scrollMessagesToBottom);
  scrollMessagesToBottomRef.current = scrollMessagesToBottom;

  /** Double-rAF + timeout ngắn — chờ DOM mini mount / layout tin nhắn. */
  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const run = () => {
        if (!shouldScrollToBottomRef.current) return;
        scrollMessagesToBottom(behavior);
      };
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(run);
      });
      window.setTimeout(run, 50);
      window.setTimeout(run, 180);
    },
    [scrollMessagesToBottom],
  );

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
      miniLeavingRef.current = false;
      setMiniOpen(false);
      setMiniLeaving(false);
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
        if (
          miniRoomIdRef.current === roomId &&
          shouldScrollToBottomRef.current
        ) {
          scheduleScrollToBottom("auto");
        }
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
          readCursors: page.readCursors ?? [],
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
          scheduleScrollToBottom("auto");
        }
      }
    },
    [
      getCachedRoomMessages,
      patchRoomState,
      pinnedRoomIdSet,
      pinnedThreadSnapshots,
      prefetchChatData,
      scheduleScrollToBottom,
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
        miniOpen &&
        !miniLeaving &&
        miniThread &&
        miniThread.roomId !== thread.roomId;

      if (switching && miniThread) {
        saveComposeForRoom(miniThread.roomId);
        markRoomDismissable(miniThread.roomId);
      }

      setMiniLeaving(false);
      miniLeavingRef.current = false;
      setMiniThread(thread);
      setMiniOpen(true);
      setStickerPickerOpen(false);
      clearMessageChrome();
      restoreComposeForRoom(thread.roomId);
      setLoadError(null);
      shouldScrollToBottomRef.current = true;

      if (!hydratedRoomsRef.current.has(thread.roomId)) {
        void loadRecentMessages(thread);
      } else {
        scheduleScrollToBottom("auto");
      }
    },
    [
      clearMessageChrome,
      loadRecentMessages,
      markRoomDismissable,
      miniLeaving,
      miniOpen,
      miniThread,
      restoreComposeForRoom,
      saveComposeForRoom,
      scheduleScrollToBottom,
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
        miniLeavingRef.current = false;
        setMiniOpen(false);
        setMiniLeaving(false);
        setMiniThread(null);
        setStickerPickerOpen(false);
        clearMessageChrome();
        setLoadError(null);
      }
    },
    [clearMessageChrome, miniThread?.roomId, saveComposeForRoom],
  );

  const closeMini = useCallback(() => {
    if (!miniOpen || miniLeavingRef.current || !miniThread) return;
    const roomId = miniThread.roomId;
    saveComposeForRoom(roomId);
    markRoomDismissable(roomId);
    setStickerPickerOpen(false);
    clearMessageChrome();
    setLoadError(null);
    miniLeavingRef.current = true;
    setMiniLeaving(true);
  }, [
    clearMessageChrome,
    markRoomDismissable,
    miniOpen,
    miniThread,
    saveComposeForRoom,
  ]);

  const finishCloseMini = useCallback(() => {
    if (!miniLeavingRef.current) return;
    miniLeavingRef.current = false;
    setMiniOpen(false);
    setMiniLeaving(false);
    setMiniThread(null);
    clearMessageChrome();
    void syncThreads();
  }, [clearMessageChrome, syncThreads]);

  useEffect(() => {
    if (!miniLeaving) return;
    const timer = window.setTimeout(() => {
      finishCloseMini();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [finishCloseMini, miniLeaving]);

  const toggleMini = useCallback(
    (thread: ChatThread) => {
      if (
        miniOpen &&
        !miniLeavingRef.current &&
        miniThread?.roomId === thread.roomId
      ) {
        closeMini();
        return;
      }
      openMini(thread);
    },
    [closeMini, miniOpen, miniThread?.roomId, openMini],
  );

  useEffect(() => {
    if (open || !pendingBubbleThread) return;
    openMini(pendingBubbleThread);
    clearPendingBubble();
  }, [clearPendingBubble, open, openMini, pendingBubbleThread]);

  /* Khi vừa mở mini (hoặc tin nhắn vừa hydrate) — luôn kéo xuống tin mới nhất. */
  useEffect(() => {
    if (!miniOpen || miniLeaving || !miniThread) return;
    if (!shouldScrollToBottomRef.current) return;
    if (loadingMessages && messages.length === 0) return;
    scheduleScrollToBottom("auto");
  }, [
    loadingMessages,
    messages.length,
    miniLeaving,
    miniOpen,
    miniThread,
    scheduleScrollToBottom,
  ]);

  const handleBubbleClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>, thread: ChatThread) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.15;
      const fromKeyboard = e.clientX === 0 && e.clientY === 0;
      clickFxIdRef.current += 1;
      setClickFx({
        id: clickFxIdRef.current,
        roomId: thread.roomId,
        x: fromKeyboard ? rect.width / 2 : e.clientX - rect.left,
        y: fromKeyboard ? rect.height / 2 : e.clientY - rect.top,
        size,
      });
      toggleMini(thread);
    },
    [toggleMini],
  );

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
    const snapshotReply = replyTarget;
    const roomId = miniThread.roomId;

    const plan = buildChatSendPlan({
      text,
      images: snapshotImages.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
      replyTo: snapshotReply ? messageToReplyPreview(snapshotReply) : null,
    });
    const optimistics = optimisticMessagesFromPlan(plan);
    if (optimistics.length === 0) return;

    setLoadError(null);
    shouldScrollToBottomRef.current = true;

    appendOptimisticMessages(roomId, optimistics);

    setDraft("");
    setPendingImages([]);
    pendingImagesRef.current = [];
    setReplyTarget(null);
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
      replyToId: snapshotReply?.id ?? null,
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
        setReplyTarget(snapshotReply);
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
    replyTarget,
    sendableImages,
    submitAlbumBatch,
    submitRoomMessage,
  ]);

  useEffect(() => {
    if (miniOpen) {
      inputRef.current?.focus();
    }
  }, [miniOpen]);

  useEffect(() => {
    /* Full overlay chat đang mở — mini ẩn, không dismiss bằng outside-click. */
    if (!miniOpen || miniLeaving || open) return;
    let removeListeners: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function onDocPointerDown(event: PointerEvent) {
        const target = event.target as Node;
        if (miniPanelRef.current?.contains(target)) return;
        /* Bubble / FAB tự xử lý toggle — không đóng bằng outside-click. */
        if (dockControlsRef.current?.contains(target)) return;
        closeMini();
      }
      function onKey(event: KeyboardEvent) {
        if (event.key !== "Escape") return;
        if (stickerPickerOpen) {
          setStickerPickerOpen(false);
          return;
        }
        closeMini();
      }
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKey);
      removeListeners = () => {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKey);
      };
    }, 0);
    return () => {
      window.clearTimeout(timer);
      removeListeners?.();
    };
  }, [closeMini, miniLeaving, miniOpen, open, stickerPickerOpen]);

  if (open) {
    return (
      <div className="j-chat-dock-launcher-row">{launcher}</div>
    );
  }

  const miniParentThread = miniThread
    ? resolveParentThread(miniThread)
    : null;
  const miniDisplayTitle =
    miniThread && miniParentThread
      ? `${miniParentThread.name} - ${miniThread.name}`
      : (miniThread?.name ?? "");

  return (
    <>
      {miniOpen && miniThread ? (
        <section
          ref={miniPanelRef}
          className={[
            "j-chat-mini",
            miniLeaving ? "is-leaving" : "",
            miniThread.parentRoomId ? "is-project-child" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-label={`Chat với ${miniDisplayTitle}`}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (miniLeaving) finishCloseMini();
          }}
        >
          <header
            className={[
              "j-chat-mini-head",
              miniThread.parentRoomId ? "is-project-child" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MiniAvatar
              thread={miniThread}
              size={34}
              parentThread={miniParentThread}
            />
            <div className="j-chat-mini-meta">
              <strong>{miniDisplayTitle}</strong>
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
                readCursors={readCursors}
                showSenderNames={Boolean(miniThread.isGroup)}
                actionHandlers={messageActionHandlers}
                editingMessageId={editingMessageId}
                editingDraft={editingDraft}
                onEditingDraftChange={setEditingDraft}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setEditingDraft("");
                }}
                roomId={miniThread.roomId}
                viewerUserId={viewerProfileId}
                renderTheirAvatar={(msg) => (
                  <MiniAvatar
                    variant="person"
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
            {replyTarget ? (
              <ChatReplyComposeBar
                target={replyTarget}
                onCancel={() => setReplyTarget(null)}
              />
            ) : null}
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

      <div ref={dockControlsRef} className="j-chat-dock-launcher-row">
        {peekThreads.length > 0 ? (
          <div
            className="j-chat-bubbles"
            role="status"
            aria-live="polite"
            aria-label={`${peekThreads.length} cuộc trò chuyện`}
          >
            {peekThreads.map((thread) => {
              const isActive =
                miniOpen &&
                !miniLeaving &&
                miniThread?.roomId === thread.roomId;
              const isPinned = pinnedRoomIdSet.has(thread.roomId);
              const isProjectChild = Boolean(thread.parentRoomId);
              const parentThread = resolveParentThread(thread);
              const showCount = thread.unread > 0;
              const showDismiss =
                !showCount &&
                !isActive &&
                !isPinned &&
                dismissableRooms.has(thread.roomId);
              const displayTitle = parentThread
                ? `${parentThread.name} - ${thread.name}`
                : thread.name;

              return (
                <div
                  key={thread.roomId}
                  className={[
                    "j-chat-bubble-wrap",
                    isActive ? "is-active" : "",
                    isPinned ? "is-pinned" : "",
                    thread.isGroup ? "is-group" : "",
                    isProjectChild ? "is-project-child" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {clickFx && clickFx.roomId === thread.roomId ? (
                    <span
                      key={clickFx.id}
                      className="j-chat-bubble-flash"
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    className="j-chat-bubble-btn"
                    aria-label={
                      thread.unread > 0
                        ? `${thread.unread} tin nhắn chưa đọc từ ${displayTitle}`
                        : isActive
                          ? `Thu chat với ${displayTitle}`
                          : isPinned
                            ? `Chat đã ghim với ${displayTitle}`
                            : `Mở chat với ${displayTitle}`
                    }
                    aria-pressed={isActive}
                    title={displayTitle}
                    onClick={(e) => handleBubbleClick(e, thread)}
                  >
                    <MiniAvatar
                      thread={thread}
                      size={48}
                      parentThread={parentThread}
                    />
                    {clickFx && clickFx.roomId === thread.roomId ? (
                      <span
                        key={clickFx.id}
                        className="j-chat-bubble-ripple"
                        aria-hidden
                        style={{
                          width: clickFx.size,
                          height: clickFx.size,
                          left: clickFx.x - clickFx.size / 2,
                          top: clickFx.y - clickFx.size / 2,
                        }}
                        onAnimationEnd={() =>
                          setClickFx((cur) =>
                            cur?.id === clickFx.id ? null : cur,
                          )
                        }
                      />
                    ) : null}
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
                          toggleMini(thread);
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
