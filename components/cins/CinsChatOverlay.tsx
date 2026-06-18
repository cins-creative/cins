"use client";

import {
  Image as ImageIcon,
  PanelRightOpen,
  Paperclip,
  Pin,
  Search,
  Send,
  PinOff,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  avatarBg,
  formatChatTime,
} from "@/lib/chat/avatar";
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
  fetchPinnedMessages,
  patchChatMessage,
  toggleChatReaction,
} from "@/lib/chat/message-actions-client";
import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import {
  patchThreadMessages,
  updateMessageInList,
} from "@/lib/chat/patch-thread-messages";
import { chatMessageMediaEntries } from "@/lib/chat/message-albums";
import {
  preserveThreadMessages,
  threadLikelyHasMessages,
} from "@/lib/chat/thread-merge";
import { applyOptimisticReaction } from "@/lib/chat/optimistic-reactions";
import {
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import { appendChatMessageIfNew, mergeChatMessageUpdate, reconcileChatMessage } from "@/lib/chat/realtime";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import {
  isPendingRoomId,
  pendingDirectRoomId,
} from "@/lib/chat/optimistic-thread";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import {
  CHAT_ORG_KIND_LABEL,
  CHAT_PARTICIPANT_KIND_LABEL,
  CHAT_THREAD_GROUP_LABEL,
  CHAT_THREAD_GROUP_ORDER,
  type ChatMessage,
  type ChatMessageReplyPreview,
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
  const existing = prev.find(
    (thread) =>
      thread.roomId === incoming.roomId ||
      thread.id === incoming.id ||
      (incoming.peerUserId != null && thread.peerUserId === incoming.peerUserId) ||
      (incoming.kind === "org" &&
        thread.kind === "org" &&
        incoming.orgId != null &&
        thread.orgId === incoming.orgId),
  );
  const merged: ChatThread = {
    ...incoming,
    messages:
      existing && existing.messages.length > 0
        ? existing.messages
        : incoming.messages,
  };
  const rest = prev.filter(
    (thread) =>
      thread.id !== merged.id &&
      thread.roomId !== merged.roomId &&
      thread.peerUserId !== merged.peerUserId &&
      !(merged.peerUserId && thread.roomId === pendingDirectRoomId(merged.peerUserId)) &&
      !(
        merged.kind === "org" &&
        thread.kind === "org" &&
        merged.orgId != null &&
        thread.orgId === merged.orgId
      ),
  );
  return [merged, ...rest];
}

type ChatSidePanel = "pin" | "media";

const SIDE_PANEL_LABEL: Record<ChatSidePanel, string> = {
  pin: "Tin đã ghim",
  media: "Ảnh",
};

const SIDE_PANEL_ORDER: ChatSidePanel[] = ["pin", "media"];

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
  if (thread.kind === "user") return null;
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
            <span className="cins-chat-thread-preview">{preview}</span>
            {thread.unread > 0 ? (
              <span className="cins-chat-unread">{thread.unread}</span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

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

export function CinsChatOverlay({ launch, onClose, onUnreadChange }: Props) {
  const {
    subscribeChatMessages,
    setChatFocus,
    viewerProfileId,
    getCachedThreads,
    getCachedRoomMessages,
    prefetchChatData,
  } = useCinsChat();
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    launch?.thread ? [launch.thread] : [],
  );
  const [activeId, setActiveId] = useState(() => launch?.thread?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  const [mobileShowThread, setMobileShowThread] = useState(() => Boolean(launch?.thread));
  const [sidePanel, setSidePanel] = useState<ChatSidePanel | null>(null);
  const [sideMediaLightboxIndex, setSideMediaLightboxIndex] = useState<number | null>(
    null,
  );
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [pinnedByRoom, setPinnedByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [activeTab, setActiveTab] = useState<ChatThreadGroup>(
    () => launch?.tab ?? launch?.thread?.group ?? "ban_be",
  );
  const [portalReady, setPortalReady] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(() => !launch?.thread);
  const [loadingOlderRoomId, setLoadingOlderRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<
    Record<string, "idle" | "loading" | "ready" | "error">
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomStatusRef = useRef<Record<string, "idle" | "loading" | "ready" | "error">>(
    {},
  );
  const hasMoreByRoomRef = useRef<Map<string, boolean>>(new Map());
  const [hasMoreByRoom, setHasMoreByRoom] = useState<Record<string, boolean>>({});
  const composeByRoomRef = useRef<Map<string, RoomComposeDraft>>(new Map());
  const pendingImagesRef = useRef<PendingImageDraft[]>([]);
  const pendingFilesByLocalIdRef = useRef<Map<string, File>>(new Map());
  const inFlightUploadsRef = useRef<
    Map<string, Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>>
  >(new Map());
  /** roomId → optimistic album id — set đồng bộ khi gửi, trước khi React render optimistic. */
  const pendingAlbumByRoomRef = useRef(new Map<string, string>());
  const activeRoomIdRef = useRef<string | null>(null);
  const shouldScrollToBottomRef = useRef(true);

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
  const forcedEmptyReloadRef = useRef<Set<string>>(new Set());
  const highlightTimerRef = useRef<number | null>(null);

  pendingImagesRef.current = pendingImages;

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );

  const sharedMedia = useMemo(() => {
    if (!active) return [];
    return chatMessageMediaEntries(active.messages).reverse();
  }, [active]);

  const sharedMediaUrls = useMemo(
    () => sharedMedia.map((entry) => entry.src),
    [sharedMedia],
  );

  useEffect(() => {
    setSideMediaLightboxIndex(null);
    setReplyTarget(null);
    setEditingMessageId(null);
    setEditingDraft("");
  }, [active?.roomId]);

  activeRoomIdRef.current = active?.roomId ?? null;

  const activeRoomStatus = active?.roomId ? roomStatus[active.roomId] : undefined;
  const isPendingRoom = active?.roomId != null && isPendingRoomId(active.roomId);
  const loadingMessages =
    active?.roomId != null &&
    !isPendingRoom &&
    (activeRoomStatus === "idle" || activeRoomStatus === "loading");
  const messagesLoaded = activeRoomStatus === "ready";
  const messagesLoadError = activeRoomStatus === "error";
  const connecting = Boolean(launch?.resolving && isPendingRoom);

  const patchRoomStatus = useCallback(
    (roomId: string, status: "idle" | "loading" | "ready" | "error") => {
      roomStatusRef.current = { ...roomStatusRef.current, [roomId]: status };
      setRoomStatus((prev) => ({ ...prev, [roomId]: status }));
    },
    [],
  );

  useEffect(() => {
    return () => {
      revokeDraftImageUrls(pendingImagesRef.current);
    };
  }, []);

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

      if (activeRoomIdRef.current !== roomId) return;

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
      const roomId = activeRoomIdRef.current;
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

  const hasMoreOlder = active?.roomId
    ? hasMoreByRoom[active.roomId] ?? false
    : false;
  const loadingOlder =
    active?.roomId != null && loadingOlderRoomId === active.roomId;

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
    setChatFocus(active?.roomId ?? null, "full");
    return () => setChatFocus(null, null);
  }, [active?.roomId, setChatFocus]);

  useEffect(() => {
    return subscribeChatMessages((event) => {
      let missingThread = false;

      setThreads((prev) => {
        let found = false;
        const next = prev.map((t) => {
          if (t.roomId !== event.roomId) return t;
          found = true;
          const isActive = t.roomId === activeRoomIdRef.current;
          const pendingAlbumId =
            pendingAlbumByRoomRef.current.get(event.roomId) ?? null;
          return {
            ...t,
            preview: event.preview,
            lastAt: event.lastAt,
            messages: isActive
              ? event.event === "update"
                ? mergeChatMessageUpdate(t.messages, event.message)
                : appendChatMessageIfNew(t.messages, event.message, {
                    pendingAlbumOptimisticId: pendingAlbumId,
                  })
              : t.messages,
            unread: isActive
              ? 0
              : event.event === "insert" && event.message.from === "them"
                ? t.unread + 1
                : t.unread,
          };
        });

        if (!found) missingThread = true;
        return next;
      });

      if (missingThread) {
        void (async () => {
          try {
            const res = await fetch("/api/chat/threads", { cache: "no-store" });
            if (!res.ok) return;
            const json = (await res.json()) as { threads?: ChatThread[] };
            const incoming = json.threads?.find((t) => t.roomId === event.roomId);
            if (!incoming) return;
            setThreads((prev) => mergeLaunchThread(prev, incoming));
          } catch {
            /* ignore */
          }
        })();
      }

      if (
        event.roomId === activeRoomIdRef.current &&
        event.message.from === "them"
      ) {
        void fetch(`/api/chat/rooms/${event.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tin_nhan_cuoi: event.message.id }),
        });
      }

      if (event.roomId === activeRoomIdRef.current) {
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
      }
    });
  }, [subscribeChatMessages]);

  useEffect(() => {
    if (!launch?.thread) return;

    const incoming = launch.thread;
    setThreads((prev) => mergeLaunchThread(prev, incoming));
    setActiveId(incoming.id);
    setActiveTab(launch.tab ?? incoming.group);
    setMobileShowThread(true);

    if (incoming.peerUserId) {
      const pendingId = pendingDirectRoomId(incoming.peerUserId);
      if (roomStatusRef.current[pendingId]) {
        const next = { ...roomStatusRef.current };
        delete next[pendingId];
        roomStatusRef.current = next;
        setRoomStatus(next);
      }
    }
  }, [launch?.thread, launch?.tab]);

  useEffect(() => {
    void (async () => {
      setLoadError(null);

      const cached = getCachedThreads();
      if (cached?.threads.length) {
        setThreads((prev) => {
          let next = preserveThreadMessages(prev, cached.threads);
          if (launch?.thread) {
            next = mergeLaunchThread(next, launch.thread);
          }
          return next;
        });
        onUnreadChange(cached.totalUnread);
        setLoadingThreads(false);
        setActiveId((current) => {
          if (launch?.thread) return launch.thread.id;
          if (current) return current;
          return cached.threads[0]?.id ?? "";
        });
      } else if (!launch?.thread) {
        setLoadingThreads(true);
      }

      try {
        const snapshot = await prefetchChatData();
        if (!snapshot) {
          if (!cached?.threads.length && !launch?.thread) {
            throw new Error("Không tải được hội thoại.");
          }
          return;
        }

        if (viewerProfileId) {
          writeChatThreadsCache(viewerProfileId, snapshot);
        }

        setThreads((prev) => {
          let next = preserveThreadMessages(prev, snapshot.threads);
          if (launch?.thread) {
            next = mergeLaunchThread(next, launch.thread);
          }
          return next;
        });
        onUnreadChange(snapshot.totalUnread);

        setActiveId((current) => {
          if (launch?.thread) return launch.thread.id;
          if (current) return current;
          return snapshot.threads[0]?.id ?? "";
        });
      } catch (error) {
        if (!launch?.thread && !cached?.threads.length) {
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
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sidePanel) {
        setSidePanel(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sidePanel]);

  const loadMessages = useCallback(
    async (roomId: string, options?: { force?: boolean }) => {
      if (isPendingRoomId(roomId)) return;

      const status = roomStatusRef.current[roomId] ?? "idle";
      if (!options?.force && (status === "loading" || status === "ready")) {
        return;
      }

      patchRoomStatus(roomId, "loading");
      setLoadError(null);
      shouldScrollToBottomRef.current = true;

      const cached = getCachedRoomMessages(roomId);
      if (cached?.length) {
        setThreads((prev) => {
          const next = prev.map((t) =>
            t.roomId === roomId ? { ...t, messages: cached, unread: 0 } : t,
          );
          onUnreadChange(next.reduce((sum, t) => sum + t.unread, 0));
          return next;
        });
        if (activeRoomIdRef.current === roomId && shouldScrollToBottomRef.current) {
          requestAnimationFrame(() => scrollMessagesToBottom("auto"));
        }
      }

      try {
        const page = await fetchRoomMessagesPage(roomId);
        if (!page) {
          throw new Error("Không tải được tin nhắn.");
        }

        hasMoreByRoomRef.current.set(roomId, page.hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: page.hasMore }));
        if (viewerProfileId) {
          writeRoomMessagesCache(viewerProfileId, roomId, page.messages);
        }
        setThreads((prev) => {
          const next = prev.map((t) =>
            t.roomId === roomId
              ? { ...t, messages: page.messages, unread: 0 }
              : t,
          );
          onUnreadChange(next.reduce((sum, t) => sum + t.unread, 0));
          return next;
        });
        setPinnedByRoom((prev) => ({
          ...prev,
          [roomId]: page.pinnedMessages ?? [],
        }));
        patchRoomStatus(roomId, "ready");
      } catch (error) {
        if (cached?.length) {
          patchRoomStatus(roomId, "ready");
        } else {
          patchRoomStatus(roomId, "error");
          setLoadError(
            error instanceof Error ? error.message : "Không tải được tin nhắn.",
          );
        }
      } finally {
        if (
          activeRoomIdRef.current === roomId &&
          shouldScrollToBottomRef.current
        ) {
          requestAnimationFrame(() => scrollMessagesToBottom("auto"));
        }
      }
    },
    [
      getCachedRoomMessages,
      onUnreadChange,
      patchRoomStatus,
      scrollMessagesToBottom,
      viewerProfileId,
    ],
  );

  const loadOlderMessages = useCallback(
    async (roomId: string) => {
      if (loadingOlderRoomId || !hasMoreByRoomRef.current.get(roomId)) return;

      const thread = threads.find((t) => t.roomId === roomId);
      const before = thread?.messages[0]?.id;
      if (!thread || !before) return;

      const container = messagesContainerRef.current;
      const prevHeight = container?.scrollHeight ?? 0;

      setLoadingOlderRoomId(roomId);
      shouldScrollToBottomRef.current = false;
      try {
        const page = await fetchRoomMessagesPage(roomId, { before });
        if (!page) return;

        hasMoreByRoomRef.current.set(roomId, page.hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: page.hasMore }));
        setThreads((prev) =>
          prev.map((t) =>
            t.roomId === roomId
              ? { ...t, messages: [...page.messages, ...t.messages] }
              : t,
          ),
        );

        requestAnimationFrame(() => {
          const el = messagesContainerRef.current;
          if (!el) return;
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      } finally {
        setLoadingOlderRoomId((current) => (current === roomId ? null : current));
      }
    },
    [loadingOlderRoomId, threads],
  );

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    const roomId = activeRoomIdRef.current;
    if (!el || !roomId || loadingOlderRoomId || !hasMoreByRoomRef.current.get(roomId)) {
      return;
    }
    if (el.scrollTop > 72) return;
    void loadOlderMessages(roomId);
  }, [loadOlderMessages, loadingOlderRoomId]);

  useEffect(() => {
    const roomId = active?.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;

    const status = roomStatusRef.current[roomId] ?? "idle";
    const staleEmpty =
      status === "ready" &&
      active.messages.length === 0 &&
      threadLikelyHasMessages(active) &&
      !forcedEmptyReloadRef.current.has(roomId);

    if (staleEmpty) {
      forcedEmptyReloadRef.current.add(roomId);
      void loadMessages(roomId, { force: true });
      return;
    }

    void loadMessages(roomId);
  }, [
    active?.messages.length,
    active?.preview,
    active?.roomId,
    loadMessages,
  ]);

  const selectThread = useCallback(
    (thread: ChatThread) => {
      const prevRoomId = activeRoomIdRef.current;
      if (prevRoomId && prevRoomId !== thread.roomId) {
        composeByRoomRef.current.set(prevRoomId, {
          text: draft,
          images: pendingImages,
        });
      }

      shouldScrollToBottomRef.current = true;
      setActiveId(thread.id);
      setMobileShowThread(true);
      setSidePanel(null);
      setActiveTab(thread.group);
      restoreComposeForRoom(thread.roomId);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, unread: 0 } : t)),
      );
      const forceReload =
        thread.messages.length === 0 ||
        roomStatusRef.current[thread.roomId] === "error";
      void loadMessages(thread.roomId, { force: forceReload });
      if (
        !forceReload &&
        thread.messages.length > 0 &&
        roomStatusRef.current[thread.roomId] === "ready"
      ) {
        requestAnimationFrame(() => scrollMessagesToBottom("auto"));
      }

      if (thread.messages.length > 0) {
        void fetch(`/api/chat/rooms/${thread.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_tin_nhan_cuoi: thread.messages.at(-1)?.id,
          }),
        });
      }
    },
    [draft, loadMessages, pendingImages, restoreComposeForRoom, scrollMessagesToBottom],
  );

  const toggleExpandPanel = useCallback(() => {
    setSidePanel((cur) => (cur ? null : "pin"));
  }, []);

  const selectSidePanelTab = useCallback((panel: ChatSidePanel) => {
    setSidePanel(panel);
  }, []);

  const sendableImages = pendingImages.filter((image) => !image.error);
  const canSend =
    Boolean(active) &&
    !isPendingRoom &&
    !connecting &&
    (draft.trim().length > 0 || sendableImages.length > 0);

  const activePinnedMessages = useMemo(
    () => (active?.roomId ? pinnedByRoom[active.roomId] ?? [] : []),
    [active?.roomId, pinnedByRoom],
  );

  const patchActiveThreadMessages = useCallback(
    (updater: (messages: ChatMessage[]) => ChatMessage[]) => {
      if (!active) return;
      setThreads((prev) => patchThreadMessages(prev, active.id, updater));
    },
    [active],
  );

  const refreshPinnedForRoom = useCallback(async (roomId: string) => {
    const pinned = await fetchPinnedMessages(roomId);
    setPinnedByRoom((prev) => ({ ...prev, [roomId]: pinned }));
  }, []);

  const highlightMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`cins-chat-msg-${messageId}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-msg-highlight");
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      el.classList.remove("is-msg-highlight");
      highlightTimerRef.current = null;
    }, 1800);
    return true;
  }, []);

  const scrollToMessage = useCallback(
    async (messageId: string) => {
      if (!active) return;
      shouldScrollToBottomRef.current = false;

      const roomId = active.roomId;
      if (isPendingRoomId(roomId)) return;

      if (active.messages.some((m) => m.id === messageId)) {
        requestAnimationFrame(() => highlightMessage(messageId));
        return;
      }

      let msgs = active.messages;
      let hasMore = hasMoreByRoomRef.current.get(roomId) ?? false;

      while (hasMore) {
        const before = msgs[0]?.id;
        if (!before) break;

        const page = await fetchRoomMessagesPage(roomId, { before });
        if (!page?.messages.length) break;

        msgs = [...page.messages, ...msgs];
        hasMore = page.hasMore;
        hasMoreByRoomRef.current.set(roomId, hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: hasMore }));
        setThreads((prev) =>
          prev.map((t) => (t.roomId === roomId ? { ...t, messages: msgs } : t)),
        );

        if (msgs.some((m) => m.id === messageId)) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => highlightMessage(messageId));
          });
          return;
        }
      }

      setLoadError("Không tìm thấy tin nhắn trong hội thoại.");
    },
    [active, highlightMessage],
  );

  const messageActionHandlers = useMemo<ChatMessageActionHandlers>(
    () => ({
      onReply: (msg) => {
        setReplyTarget(msg);
        setEditingMessageId(null);
        inputRef.current?.focus();
      },
      onRecall: (msg) => {
        if (!active) return;
        const snapshot = { ...msg };
        patchActiveThreadMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { deleted: true, body: "" }),
        );
        void patchChatMessage(active.roomId, msg.id, { action: "recall" }).then(
          (res) => {
            if (res.error) {
              patchActiveThreadMessages((msgs) =>
                updateMessageInList(msgs, msg.id, snapshot),
              );
              setLoadError(res.error);
              return;
            }
            if (res.message) {
              patchActiveThreadMessages((msgs) =>
                msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
              );
            }
          },
        );
      },
      onEdit: (msg) => {
        setEditingMessageId(msg.id);
        setEditingDraft(msg.body);
        setReplyTarget(null);
      },
      onPin: (msg, pinned) => {
        if (!active) return;
        const roomId = active.roomId;
        const prevPinned = pinnedByRoom[roomId] ?? [];
        patchActiveThreadMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { pinned }),
        );
        setPinnedByRoom((prev) => {
          const roomPins = prev[roomId] ?? [];
          if (pinned) {
            return {
              ...prev,
              [roomId]: [{ ...msg, pinned: true }, ...roomPins.filter((p) => p.id !== msg.id)],
            };
          }
          return {
            ...prev,
            [roomId]: roomPins.filter((p) => p.id !== msg.id),
          };
        });
        void patchChatMessage(roomId, msg.id, { action: "pin", pinned }).then((res) => {
          if (res.error) {
            patchActiveThreadMessages((msgs) =>
              updateMessageInList(msgs, msg.id, { pinned: !pinned }),
            );
            setPinnedByRoom((prev) => ({ ...prev, [roomId]: prevPinned }));
            setLoadError(res.error);
            return;
          }
          void refreshPinnedForRoom(roomId);
        });
      },
      onReaction: (msg, emoji, activeReaction) => {
        if (!active) return;
        const prevReactions = msg.reactions;
        const nextReactions = applyOptimisticReaction(msg.reactions, emoji, activeReaction);
        patchActiveThreadMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { reactions: nextReactions }),
        );
        void toggleChatReaction(active.roomId, msg.id, emoji, activeReaction).then((res) => {
          if (res.error) {
            patchActiveThreadMessages((msgs) =>
              updateMessageInList(msgs, msg.id, { reactions: prevReactions }),
            );
            setLoadError(res.error);
            return;
          }
          if (res.reactions) {
            patchActiveThreadMessages((msgs) =>
              updateMessageInList(msgs, msg.id, { reactions: res.reactions }),
            );
          }
        });
      },
    }),
    [active, patchActiveThreadMessages, pinnedByRoom, refreshPinnedForRoom],
  );

  const handleSaveEdit = useCallback(
    (msg: ChatMessage) => {
      if (!active) return;
      const body = editingDraft.trim();
      if (!body || body === msg.body) {
        setEditingMessageId(null);
        return;
      }
      const snapshot = { body: msg.body, edited: msg.edited, editedAt: msg.editedAt };
      const now = new Date().toISOString();
      patchActiveThreadMessages((msgs) =>
        updateMessageInList(msgs, msg.id, {
          body,
          edited: true,
          editedAt: now,
        }),
      );
      setEditingMessageId(null);
      setEditingDraft("");
      void patchChatMessage(active.roomId, msg.id, {
        action: "edit",
        noi_dung: body,
      }).then((res) => {
        if (res.error) {
          patchActiveThreadMessages((msgs) =>
            updateMessageInList(msgs, msg.id, snapshot),
          );
          setLoadError(res.error);
          return;
        }
        if (res.message) {
          patchActiveThreadMessages((msgs) =>
            msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
          );
        }
      });
    },
    [active, editingDraft, patchActiveThreadMessages],
  );

  const appendOptimisticMessages = useCallback(
    (thread: ChatThread, optimistics: ChatMessage[]) => {
      if (optimistics.length === 0) return;
      const last = optimistics[optimistics.length - 1]!;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === thread.id
            ? {
                ...t,
                messages: [...t.messages, ...optimistics],
                preview: messagePreviewText(last),
                lastAt: last.sentAt,
              }
            : t,
        ),
      );

      if (shouldScrollToBottomRef.current) {
        requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
      }
    },
    [scrollMessagesToBottom],
  );

  const submitRoomMessage = useCallback(
    async (
      thread: ChatThread,
      payload: ChatSendPayload,
      optimisticId: string,
    ) => {
      try {
        const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          message?: ChatThread["messages"][number];
          error?: string;
        };
        if (!res.ok || !json.message) {
          throw new Error(json.error ?? "Không gửi được tin nhắn.");
        }

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== thread.id) return t;
            const messages = reconcileChatMessage(t.messages, json.message!);
            if (viewerProfileId) {
              writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
            }
            return {
              ...t,
              messages,
              preview: messagePreviewText(json.message!),
              lastAt: json.message!.sentAt,
            };
          }),
        );
        return true;
      } catch (error) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  messages: t.messages.filter((m) => m.id !== optimisticId),
                }
              : t,
          ),
        );
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
      thread: ChatThread,
      albumOptimisticId: string,
      payloads: ChatSendPayload[],
    ) => {
      const realMessages: ChatMessage[] = [];
      try {
        for (const payload of payloads) {
          const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
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

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== thread.id) return t;
            const messages = replaceOptimisticAlbumWithRealMessages(
              t.messages,
              albumOptimisticId,
              realMessages,
            );
            if (viewerProfileId) {
              writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
            }
            const last = realMessages[realMessages.length - 1]!;
            return {
              ...t,
              messages,
              preview: messagePreviewText(last),
              lastAt: last.sentAt,
            };
          }),
        );
        pendingAlbumByRoomRef.current.delete(thread.roomId);
        return true;
      } catch (error) {
        pendingAlbumByRoomRef.current.delete(thread.roomId);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  messages: t.messages.filter((m) => m.id !== albumOptimisticId),
                }
              : t,
          ),
        );
        setLoadError(
          error instanceof Error ? error.message : "Không gửi được ảnh.",
        );
        return false;
      }
    },
    [viewerProfileId],
  );

  const sendMessage = useCallback(() => {
    if (!active || !canSend) return;

    const text = draft.trim();
    const snapshotText = draft;
    const snapshotImages = sendableImages;
    const snapshotReply = replyTarget;
    const thread = active;

    const replyPreview = snapshotReply
      ? messageToReplyPreview(snapshotReply)
      : null;

    const plan = buildChatSendPlan({
      text,
      images: snapshotImages.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
      replyTo: replyPreview,
    });
    const optimistics = optimisticMessagesFromPlan(plan);
    if (optimistics.length === 0) return;

    appendOptimisticMessages(thread, optimistics);

    setDraft("");
    setPendingImages([]);
    pendingImagesRef.current = [];
    setReplyTarget(null);
    composeByRoomRef.current.set(thread.roomId, { text: "", images: [] });
    inputRef.current?.focus();

    const optimisticIds = new Set(optimistics.map((item) => item.id));

    if (plan.album) {
      pendingAlbumByRoomRef.current.set(thread.roomId, plan.album.optimistic.id);
    }

    void executeComposeSendPlanInBackground({
      plan,
      imageSnapshots: snapshotImages,
      filesByLocalId: pendingFilesByLocalIdRef.current,
      inFlightUploads: inFlightUploadsRef.current,
      hasText: Boolean(text),
      replyToId: snapshotReply?.id ?? null,
      sendText: plan.text
        ? () =>
            submitRoomMessage(thread, plan.text!.payload, plan.text!.optimistic.id)
        : undefined,
      sendAlbum: plan.album
        ? (payloads) =>
            submitAlbumBatch(thread, plan.album!.optimistic.id, payloads)
        : undefined,
      onFailure: () => {
        pendingAlbumByRoomRef.current.delete(thread.roomId);
        setLoadError("Không gửi được tin nhắn. Hãy thử lại.");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  messages: t.messages.filter((m) => !optimisticIds.has(m.id)),
                }
              : t,
          ),
        );
        setDraft(snapshotText);
        setPendingImages(snapshotImages);
        pendingImagesRef.current = snapshotImages;
        setReplyTarget(snapshotReply);
        composeByRoomRef.current.set(thread.roomId, {
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
    active,
    appendOptimisticMessages,
    canSend,
    draft,
    replyTarget,
    sendableImages,
    submitAlbumBatch,
    submitRoomMessage,
  ]);

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
                {active.kind === "org" ? <ChatKindPill thread={active} /> : null}
              </span>
              {active.online ? (
                <span>
                  <span className="cins-chat-online-dot" aria-hidden />
                  Đang hoạt động
                </span>
              ) : active.kind === "org" && active.role ? (
                <span>{active.role}</span>
              ) : null}
            </div>
            <div className="cins-chat-convo-actions">
              <button
                type="button"
                className={`cins-chat-icon-btn${sidePanel ? " is-active" : ""}`}
                aria-label="Mở rộng"
                aria-pressed={Boolean(sidePanel)}
                aria-expanded={Boolean(sidePanel)}
                title="Mở rộng"
                onClick={toggleExpandPanel}
              >
                <PanelRightOpen size={16} strokeWidth={1.8} aria-hidden />
              </button>
              {!sidePanel ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Đóng"
                  title="Đóng"
                  onClick={onClose}
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
            </div>
          </header>

          <div
            className="cins-chat-messages"
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            {loadingOlder ? (
              <p className="cins-chat-messages-empty">Đang tải tin cũ hơn…</p>
            ) : null}
            {connecting ? (
              <p className="cins-chat-messages-empty">Đang kết nối hội thoại…</p>
            ) : loadingMessages ? (
              <p className="cins-chat-messages-empty">Đang tải tin nhắn…</p>
            ) : messagesLoadError ? (
              <p className="cins-chat-messages-empty">
                {loadError ?? "Không tải được tin nhắn."}
              </p>
            ) : messagesLoaded && active.messages.length === 0 ? (
              <p className="cins-chat-messages-empty">
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện với{" "}
                <strong>{active.name}</strong>…
              </p>
            ) : null}
            {active.messages.length > 0 ? (
              <ChatMessageThreadItems
                messages={active.messages}
                actionHandlers={messageActionHandlers}
                editingMessageId={editingMessageId}
                editingDraft={editingDraft}
                onEditingDraftChange={setEditingDraft}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setEditingDraft("");
                }}
                renderTheirAvatar={() => (
                  <ChatAvatar
                    initial={active.avatarInitial}
                    hue={active.avatarHue}
                    size={28}
                    kind={active.kind}
                    verified={active.verified}
                    avatarUrl={active.avatarUrl}
                  />
                )}
              />
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <footer className="cins-chat-compose">
            {replyTarget ? (
              <ChatReplyComposeBar
                target={replyTarget}
                onCancel={() => setReplyTarget(null)}
              />
            ) : null}
            {pendingImages.length > 0 ? (
              <div className="j-chat-mini-compose-attach-list cins-chat-compose-attach-list">
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
            <div className="cins-chat-compose-row">
            <div className="cins-chat-input-wrap">
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
                className="cins-chat-attach"
                aria-label="Đính kèm ảnh"
                disabled={connecting || isPendingRoom}
                onClick={() => fileInputRef.current?.click()}
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
                onPaste={handleComposePaste}
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
              disabled={!canSend}
              onClick={() => void sendMessage()}
            >
              <Send size={16} strokeWidth={2} aria-hidden />
            </button>
            </div>
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
                <div
                  className="cins-chat-side-tabs"
                  role="tablist"
                  aria-label="Panel mở rộng"
                >
                  {SIDE_PANEL_ORDER.map((panel) => {
                    const TabIcon = panel === "pin" ? Pin : ImageIcon;
                    return (
                      <button
                        key={panel}
                        type="button"
                        role="tab"
                        className={`cins-chat-side-tab${sidePanel === panel ? " is-active" : ""}`}
                        aria-selected={sidePanel === panel}
                        aria-controls={`cins-chat-side-panel-${panel}`}
                        id={`cins-chat-side-tab-${panel}`}
                        title={SIDE_PANEL_LABEL[panel]}
                        onClick={() => selectSidePanelTab(panel)}
                      >
                        <TabIcon size={14} strokeWidth={1.9} aria-hidden />
                        <span>{SIDE_PANEL_LABEL[panel]}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Đóng panel"
                  onClick={() => setSidePanel(null)}
                >
                  <X size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </header>

              <div
                className="cins-chat-side-body"
                role="tabpanel"
                id={`cins-chat-side-panel-${sidePanel}`}
                aria-labelledby={`cins-chat-side-tab-${sidePanel}`}
              >
                {sidePanel === "pin" ? (
                  <ul className="cins-chat-side-list" role="list">
                    {activePinnedMessages.map((msg) => (
                      <li key={msg.id} className="cins-chat-side-pin">
                        <button
                          type="button"
                          className="cins-chat-side-pin-body"
                          onClick={() => void scrollToMessage(msg.id)}
                        >
                          <div className="cins-chat-side-pin-meta">
                            <span className="cins-chat-side-pin-sender">
                              {msg.from === "me" ? "Bạn" : active.name}
                            </span>
                            <time dateTime={msg.sentAt}>
                              {formatChatTime(msg.sentAt)}
                            </time>
                          </div>
                          <p>
                            {msg.deleted
                              ? "Tin đã thu hồi"
                              : msg.body.trim() ||
                                (msg.imageUrl ? "Ảnh đính kèm" : "Tin nhắn")}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="cins-chat-side-pin-unpin"
                          aria-label="Bỏ ghim tin nhắn"
                          onClick={() => messageActionHandlers.onPin(msg, false)}
                        >
                          <PinOff size={15} strokeWidth={2} aria-hidden />
                        </button>
                      </li>
                    ))}
                    {activePinnedMessages.length === 0 ? (
                      <p className="cins-chat-side-empty">Chưa có tin ghim.</p>
                    ) : null}
                  </ul>
                ) : null}

                {sidePanel === "media" ? (
                  <>
                    <div className="cins-chat-side-media">
                      {sharedMedia.length === 0 ? (
                        <p className="cins-chat-side-empty">
                          Chưa có ảnh trong hội thoại.
                        </p>
                      ) : (
                        sharedMedia.map((entry, index) => (
                          <button
                            key={entry.id}
                            type="button"
                            className="cins-chat-side-media-cell"
                            aria-label={`Xem ảnh ${index + 1}`}
                            onClick={() => setSideMediaLightboxIndex(index)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={entry.src} alt="Ảnh đính kèm" />
                          </button>
                        ))
                      )}
                    </div>
                    {sideMediaLightboxIndex != null && sharedMediaUrls.length > 0 ? (
                      <ChatImageLightbox
                        images={sharedMediaUrls}
                        index={sideMediaLightboxIndex}
                        onClose={() => setSideMediaLightboxIndex(null)}
                        onIndexChange={setSideMediaLightboxIndex}
                      />
                    ) : null}
                  </>
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
