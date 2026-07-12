"use client";

import {
  Image as ImageIcon,
  MessageSquareQuote,
  PanelRightOpen,
  Paperclip,
  Pin,
  PictureInPicture2,
  Search,
  Send,
  ArrowUpToLine,
  BellOff,
  PinOff,
  UserPlus,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { ChatCreateGroupModal } from "@/components/cins/ChatCreateGroupModal";
import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import {
  buildThreadMenuActions,
  ChatThreadRowMenu,
  useThreadLongPress,
} from "@/components/cins/ChatThreadRowMenu";
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
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import { appendChatMessageIfNew, mergeChatMessageUpdate, reconcileChatMessage } from "@/lib/chat/realtime";
import { applyChatViewerPerspective } from "@/lib/chat/message-perspective";
import { applyKnownGroupSender } from "@/lib/chat/apply-known-group-sender";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import {
  isPendingRoomId,
  pendingDirectRoomId,
} from "@/lib/chat/optimistic-thread";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import {
  CHAT_ORG_KIND_LABEL,
  CHAT_PARTICIPANT_KIND_LABEL,
  CHAT_THREAD_GROUP_LABEL,
  CHAT_THREAD_GROUP_ORDER,
  type ChatContextCard,
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
        thread.orgId === incoming.orgId) ||
      (incoming.isGroup && thread.isGroup && thread.roomId === incoming.roomId),
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

type BanBeListFilter = "all" | "nhom" | "ca_nhan";

const BAN_BE_FILTER_ORDER: BanBeListFilter[] = ["all", "nhom", "ca_nhan"];

const BAN_BE_FILTER_LABEL: Record<BanBeListFilter, string> = {
  all: "Tất cả",
  nhom: "Nhóm",
  ca_nhan: "Cá nhân",
};

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
  isListPinned,
  isMuted,
  canShowMenu,
  isMenuOpen,
  onMenuOpenChange,
  onSelect,
  onViewProfile,
  onToggleListPin,
  onToggleMute,
  onLeaveGroup,
  onDeleteGroup,
  onHideThread,
}: {
  thread: ChatThread;
  isActive: boolean;
  isListPinned: boolean;
  isMuted: boolean;
  canShowMenu: boolean;
  isMenuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onSelect: (thread: ChatThread) => void;
  onViewProfile: (thread: ChatThread) => void;
  onToggleListPin: (thread: ChatThread) => void;
  onToggleMute: (thread: ChatThread) => void;
  onLeaveGroup: (thread: ChatThread) => void;
  onDeleteGroup: (thread: ChatThread) => void;
  onHideThread: (thread: ChatThread) => void;
}) {
  const preview = thread.typing ? "… đang gõ" : thread.preview;
  const { touchHandlers, consumeLongPress } = useThreadLongPress(
    () => onMenuOpenChange(true),
    !canShowMenu,
  );

  const canViewProfile =
    !thread.isGroup &&
    thread.kind === "user" &&
    Boolean(thread.peerSlug?.trim());

  const menuActions = buildThreadMenuActions({
    isListPinned,
    isMuted,
    isGroup: Boolean(thread.isGroup),
    isGroupAdmin: Boolean(thread.isGroupAdmin),
    canViewProfile,
    onViewProfile: () => onViewProfile(thread),
    onToggleListPin: () => onToggleListPin(thread),
    onToggleMute: () => onToggleMute(thread),
    onLeaveGroup: () => onLeaveGroup(thread),
    onDeleteGroup: () => onDeleteGroup(thread),
    onHideThread: () => onHideThread(thread),
  });

  return (
    <li
      className={`cins-chat-thread-item${isListPinned ? " is-list-pinned" : ""}${isMenuOpen ? " is-menu-open" : ""}${isMuted ? " is-muted" : ""}`}
      onContextMenu={(event) => {
        if (canShowMenu) event.preventDefault();
      }}
      {...touchHandlers}
    >
      <div className="cins-chat-thread-row">
        <button
          type="button"
          className={`cins-chat-thread${isActive ? " is-active" : ""}${thread.kind === "org" ? " is-org-thread" : " is-user-thread"}${thread.isGroup ? " is-group-thread" : ""}`}
          onClick={() => {
            if (consumeLongPress()) return;
            onSelect(thread);
          }}
        >
          {thread.isGroup ? (
            <ChatGroupAvatar
              size={40}
              avatarUrl={thread.avatarUrl}
              members={thread.memberAvatars ?? []}
            />
          ) : (
            <ChatAvatar
              initial={thread.avatarInitial}
              hue={thread.avatarHue}
              kind={thread.kind}
              verified={thread.verified}
              avatarUrl={thread.avatarUrl}
            />
          )}
          <span className="cins-chat-thread-main">
            <span className="cins-chat-thread-top">
              <span className="cins-chat-thread-name">
                {isListPinned ? (
                  <ArrowUpToLine
                    size={12}
                    strokeWidth={2.4}
                    className="cins-chat-thread-list-pin-inline"
                    aria-hidden
                  />
                ) : null}
                {isMuted ? (
                  <BellOff
                    size={12}
                    strokeWidth={2.4}
                    className="cins-chat-thread-muted-inline"
                    aria-hidden
                  />
                ) : null}
                <strong>{thread.name}</strong>
                {thread.isGroup ? (
                  <span className="cins-chat-kind-pill is-group">Nhóm</span>
                ) : (
                  <ChatKindPill thread={thread} />
                )}
              </span>
              <time dateTime={thread.lastAt}>{formatChatTime(thread.lastAt)}</time>
            </span>
            <span className="cins-chat-thread-bottom">
              <span className="cins-chat-thread-preview">{preview}</span>
              {thread.unread > 0 && !isMuted ? (
                <span className="cins-chat-unread">{thread.unread}</span>
              ) : null}
            </span>
          </span>
        </button>
        {canShowMenu ? (
          <ChatThreadRowMenu
            open={isMenuOpen}
            onOpenChange={onMenuOpenChange}
            actions={menuActions}
          />
        ) : null}
      </div>
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
  const router = useRouter();
  const {
    subscribeChatMessages,
    setChatFocus,
    viewerProfileId,
    getCachedThreads,
    getCachedRoomMessages,
    prefetchChatData,
    isRoomPinned,
    togglePinRoom,
    pinnedListRoomIds,
    isListPinned,
    toggleListPin,
    unpinListRoom,
    unpinRoom,
    isRoomMuted,
    toggleMuteRoom,
    hiddenRoomIds,
    hideRoom,
    unhideRoom,
  } = useCinsChat();
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    launch?.thread ? [launch.thread] : [],
  );
  const [activeId, setActiveId] = useState(() => launch?.thread?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  /** Card ngữ cảnh "chờ" theo phòng — chèn vào ô soạn, chỉ gửi khi user gửi tin. */
  const [pendingCardByRoom, setPendingCardByRoom] = useState<
    Record<string, ChatContextCard>
  >({});
  const [mobileShowThread, setMobileShowThread] = useState(() => Boolean(launch?.thread));
  const [sidePanel, setSidePanel] = useState<ChatSidePanel | null>(null);
  const [sideMediaLightboxIndex, setSideMediaLightboxIndex] = useState<number | null>(
    null,
  );
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [pinnedByRoom, setPinnedByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [activeTab, setActiveTab] = useState<ChatThreadGroup>(
    () => launch?.tab ?? launch?.thread?.group ?? "ban_be",
  );
  const [banBeFilter, setBanBeFilter] = useState<BanBeListFilter>("all");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [threadMenuRoomId, setThreadMenuRoomId] = useState<string | null>(null);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(() => !launch?.thread);
  const [loadingOlderRoomId, setLoadingOlderRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<
    Record<string, "idle" | "loading" | "ready" | "error">
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
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
  /** Đã tự mở thread đầu (hoặc có launch) — chỉ một lần mỗi lần mở overlay. */
  const autoOpenedTopRef = useRef(Boolean(launch?.thread));

  pendingImagesRef.current = pendingImages;

  // Giữ launch mới nhất cho effect prefetch (deps []) — tránh closure cũ đọc
  // thread optimistic `org:` rồi ghi đè activeId về phòng tạm sau khi đã resolve.
  const launchRef = useRef(launch);
  launchRef.current = launch;

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
    const list = threads.filter((t) => {
      if (t.group !== activeTab) return false;
      if (hiddenRoomIds.includes(t.roomId)) return false;
      if (activeTab === "ban_be") {
        if (banBeFilter === "nhom" && !t.isGroup) return false;
        if (banBeFilter === "ca_nhan" && t.isGroup) return false;
      }
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        threadKindLabel(t).toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const aIdx = pinnedListRoomIds.indexOf(a.roomId);
      const bIdx = pinnedListRoomIds.indexOf(b.roomId);
      const aPinned = aIdx >= 0;
      const bPinned = bIdx >= 0;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (aPinned && bPinned && aIdx !== bIdx) return aIdx - bIdx;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
  }, [threads, query, activeTab, banBeFilter, pinnedListRoomIds, hiddenRoomIds]);

  const banBeFilterCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inTab = threads.filter((t) => {
      if (t.group !== "ban_be") return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        threadKindLabel(t).toLowerCase().includes(q)
      );
    });
    return {
      all: inTab.length,
      nhom: inTab.filter((t) => t.isGroup).length,
      ca_nhan: inTab.filter((t) => !t.isGroup).length,
    };
  }, [threads, query]);

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
      if (event.event === "insert") {
        unhideRoom(event.roomId);
      }

      const message = applyChatViewerPerspective(
        [event.message],
        viewerProfileId,
      )[0]!;

      let missingThread = false;

      setThreads((prev) => {
        let found = false;
        const next = prev.map((t) => {
          if (t.roomId !== event.roomId) return t;
          found = true;
          const enriched = t.isGroup
            ? applyKnownGroupSender(message, t.memberAvatars)
            : message;
          const isActive = t.roomId === activeRoomIdRef.current;
          const pendingAlbumId =
            pendingAlbumByRoomRef.current.get(event.roomId) ?? null;
          return {
            ...t,
            preview: event.preview,
            lastAt: event.lastAt,
            messages: isActive
              ? event.event === "update"
                ? mergeChatMessageUpdate(t.messages, enriched)
                : appendChatMessageIfNew(t.messages, enriched, {
                    pendingAlbumOptimisticId: pendingAlbumId,
                  })
              : t.messages,
            unread: isActive
              ? 0
              : event.event === "insert" && enriched.from === "them"
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
        message.from === "them"
      ) {
        void fetch(`/api/chat/rooms/${event.roomId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tin_nhan_cuoi: message.id }),
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
  }, [subscribeChatMessages, unhideRoom, viewerProfileId]);

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

  // Card ngữ cảnh chờ: gắn theo phòng THỰC của hội thoại vừa mở. Dùng
  // active.roomId (không phải launch.thread.roomId) vì org room có thể resolve
  // sang roomId canonical khác — nếu key theo launch cũ, card sẽ mất khi
  // active đổi sang roomId thật. Chỉ gắn khi active đúng là hội thoại đã launch.
  useEffect(() => {
    const card = launch?.nguCanh;
    const launchThread = launch?.thread;
    if (!card || !launchThread || !active) return;
    const roomId = active.roomId;
    if (!roomId || isPendingRoomId(roomId)) return;
    const sameThread =
      active.id === launchThread.id ||
      (active.orgId != null && active.orgId === launchThread.orgId) ||
      (active.peerUserId != null &&
        active.peerUserId === launchThread.peerUserId);
    if (!sameThread) return;
    setPendingCardByRoom((prev) =>
      prev[roomId] ? prev : { ...prev, [roomId]: card },
    );
  }, [launch?.nguCanh, launch?.thread, active]);

  useEffect(() => {
    void (async () => {
      setLoadError(null);

      const cached = getCachedThreads();
      if (cached?.threads.length) {
        setThreads((prev) => {
          let next = preserveThreadMessages(prev, cached.threads);
          const launchThread = launchRef.current?.thread;
          if (launchThread) {
            next = mergeLaunchThread(next, launchThread);
          }
          return next;
        });
        onUnreadChange(cached.totalUnread);
        setLoadingThreads(false);
        // Không set activeId ở đây — effect auto-open chọn thread đầu danh sách đã sort.
      } else if (!launchRef.current?.thread) {
        setLoadingThreads(true);
      }

      try {
        const snapshot = await prefetchChatData();
        if (!snapshot) {
          if (!cached?.threads.length && !launchRef.current?.thread) {
            throw new Error("Không tải được hội thoại.");
          }
          return;
        }

        if (viewerProfileId) {
          writeChatThreadsCache(viewerProfileId, snapshot);
        }

        setThreads((prev) => {
          let next = preserveThreadMessages(prev, snapshot.threads);
          const launchThread = launchRef.current?.thread;
          if (launchThread) {
            next = mergeLaunchThread(next, launchThread);
          }
          return next;
        });
        onUnreadChange(snapshot.totalUnread);
        // activeId: launch effect hoặc auto-open top thread.
      } catch (error) {
        if (!launchRef.current?.thread && !cached?.threads.length) {
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

  /** Mobile keyboard — neo overlay theo visualViewport để không đẩy mất header/tin. */
  useEffect(() => {
    if (!portalReady) return;
    const root = chatRootRef.current;
    if (!root) return;

    const syncVisualViewport = () => {
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const offsetTop = Math.round(vv?.offsetTop ?? 0);
      root.style.setProperty("--cins-chat-vv-height", `${height}px`);
      root.style.setProperty("--cins-chat-vv-top", `${offsetTop}px`);
      const layoutH = window.innerHeight;
      root.classList.toggle("is-vv-shrunk", height < layoutH - 60);
    };

    syncVisualViewport();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncVisualViewport);
    vv?.addEventListener("scroll", syncVisualViewport);
    window.addEventListener("resize", syncVisualViewport);
    return () => {
      vv?.removeEventListener("resize", syncVisualViewport);
      vv?.removeEventListener("scroll", syncVisualViewport);
      window.removeEventListener("resize", syncVisualViewport);
      root.classList.remove("is-vv-shrunk");
      root.style.removeProperty("--cins-chat-vv-height");
      root.style.removeProperty("--cins-chat-vv-top");
    };
  }, [portalReady]);

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
          const next = prev.map((t) => {
            if (t.roomId !== roomId) return t;
            const cachedView = applyChatViewerPerspective(
              cached,
              viewerProfileId,
            ).map((msg) =>
              t.isGroup ? applyKnownGroupSender(msg, t.memberAvatars) : msg,
            );
            return { ...t, messages: cachedView, unread: 0 };
          });
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

        const baseMessages = applyChatViewerPerspective(
          page.messages,
          viewerProfileId,
        );
        hasMoreByRoomRef.current.set(roomId, page.hasMore);
        setHasMoreByRoom((prev) => ({ ...prev, [roomId]: page.hasMore }));
        setThreads((prev) => {
          const thread = prev.find((t) => t.roomId === roomId);
          const messages =
            thread?.isGroup
              ? baseMessages.map((msg) =>
                  applyKnownGroupSender(msg, thread.memberAvatars),
                )
              : baseMessages;
          if (viewerProfileId) {
            writeRoomMessagesCache(viewerProfileId, roomId, messages);
          }
          const next = prev.map((t) =>
            t.roomId === roomId ? { ...t, messages, unread: 0 } : t,
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

  // Mặc định mở hội thoại trên cùng của tab hiện tại (sau khi list sẵn sàng).
  useEffect(() => {
    if (autoOpenedTopRef.current) return;
    if (launch?.thread) {
      autoOpenedTopRef.current = true;
      return;
    }
    if (loadingThreads) return;

    const top = filtered[0];
    if (!top) {
      if (threads.length === 0) autoOpenedTopRef.current = true;
      return;
    }

    autoOpenedTopRef.current = true;
    selectThread(top);
  }, [filtered, launch?.thread, loadingThreads, selectThread, threads.length]);

  const removeThreadFromSidebar = useCallback(
    (thread: ChatThread) => {
      unpinListRoom(thread.roomId);
      unpinRoom(thread.roomId);
      setThreadMenuRoomId((prev) => (prev === thread.roomId ? null : prev));
      setThreads((prev) => {
        const next = prev.filter((t) => t.roomId !== thread.roomId);
        setActiveId((currentActive) => {
          if (currentActive !== thread.id) return currentActive;
          setMobileShowThread(false);
          const remaining = next.filter(
            (t) =>
              t.group === thread.group && !hiddenRoomIds.includes(t.roomId),
          );
          return remaining[0]?.id ?? "";
        });
        return next;
      });
    },
    [hiddenRoomIds, unpinListRoom, unpinRoom],
  );

  const handleHideThread = useCallback(
    (thread: ChatThread) => {
      hideRoom(thread.roomId);
      setThreadMenuRoomId((prev) => (prev === thread.roomId ? null : prev));
      setActiveId((currentActive) => {
        if (currentActive !== thread.id) return currentActive;
        setMobileShowThread(false);
        const remaining = threads.filter(
          (t) =>
            t.roomId !== thread.roomId &&
            t.group === thread.group &&
            !hiddenRoomIds.includes(t.roomId),
        );
        return remaining[0]?.id ?? "";
      });
    },
    [hiddenRoomIds, hideRoom, threads],
  );

  const handleViewProfile = useCallback(
    (thread: ChatThread) => {
      const slug = thread.peerSlug?.trim();
      if (!slug) return;
      setThreadMenuRoomId(null);
      onClose();
      router.push(`/${slug}`);
    },
    [onClose, router],
  );

  const handleLeaveGroup = useCallback(
    async (thread: ChatThread) => {
      if (
        !window.confirm(`Rời nhóm "${thread.name}"? Bạn sẽ không nhận tin nhắn từ nhóm này.`)
      ) {
        return;
      }
      try {
        const res = await fetch(`/api/chat/rooms/${thread.roomId}/leave`, {
          method: "POST",
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          window.alert(json.error ?? "Không rời được nhóm.");
          return;
        }
        removeThreadFromSidebar(thread);
      } catch {
        window.alert("Không rời được nhóm.");
      }
    },
    [removeThreadFromSidebar],
  );

  const handleDeleteGroup = useCallback(
    async (thread: ChatThread) => {
      if (
        !window.confirm(
          `Xóa nhóm "${thread.name}"? Mọi tin nhắn sẽ mất và không thể hoàn tác.`,
        )
      ) {
        return;
      }
      try {
        const res = await fetch(`/api/chat/rooms/${thread.roomId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          window.alert(json.error ?? "Không xóa được nhóm.");
          return;
        }
        removeThreadFromSidebar(thread);
      } catch {
        window.alert("Không xóa được nhóm.");
      }
    },
    [removeThreadFromSidebar],
  );

  const handleGroupCreated = useCallback(
    (thread: ChatThread) => {
      setThreads((prev) => mergeLaunchThread(prev, thread));
      selectThread(thread);
    },
    [selectThread],
  );

  const handleGroupAvatarFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const roomId = active?.roomId;
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!roomId || !file || !active?.isGroup || !active.isGroupAdmin) return;
      if (!isAllowedUploadImageFile(file)) return;

      setUploadingGroupAvatar(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch("/api/avatar/upload", {
          method: "POST",
          body: form,
        });
        const uploadJson = (await uploadRes.json()) as {
          imageId?: string;
          error?: string;
        };
        if (!uploadRes.ok || !uploadJson.imageId) {
          throw new Error(uploadJson.error ?? "Upload thất bại.");
        }

        const patchRes = await fetch(`/api/chat/rooms/${roomId}/avatar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarId: uploadJson.imageId }),
        });
        const patchJson = (await patchRes.json()) as {
          thread?: ChatThread;
          error?: string;
        };
        if (!patchRes.ok || !patchJson.thread) {
          throw new Error(patchJson.error ?? "Không lưu được ảnh nhóm.");
        }

        setThreads((prev) => mergeLaunchThread(prev, patchJson.thread!));
      } catch {
        /* ignore — có thể thêm toast sau */
      } finally {
        setUploadingGroupAvatar(false);
      }
    },
    [active?.isGroup, active?.isGroupAdmin, active?.roomId],
  );

  const toggleExpandPanel = useCallback(() => {
    setSidePanel((cur) => (cur ? null : "pin"));
  }, []);

  const selectSidePanelTab = useCallback((panel: ChatSidePanel) => {
    setSidePanel(panel);
  }, []);

  const sendableImages = pendingImages.filter((image) => !image.error);
  const rawPendingCard = active?.roomId
    ? pendingCardByRoom[active.roomId] ?? null
    : null;
  const cardAlreadyInThread = Boolean(
    rawPendingCard &&
      active?.messages.some(
        (m) =>
          m.nguCanh != null &&
          m.nguCanh.loai === rawPendingCard.loai &&
          m.nguCanh.id === rawPendingCard.id,
      ),
  );
  const activePendingCard = cardAlreadyInThread ? null : rawPendingCard;
  const canSend =
    Boolean(active) &&
    !isPendingRoom &&
    !connecting &&
    (draft.trim().length > 0 ||
      sendableImages.length > 0 ||
      activePendingCard != null);

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

        const confirmed = applyChatViewerPerspective(
          [json.message],
          viewerProfileId,
        )[0]!;

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== thread.id) return t;
            const messages = reconcileChatMessage(t.messages, confirmed);
            if (viewerProfileId) {
              writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
            }
            return {
              ...t,
              messages,
              preview: messagePreviewText(confirmed),
              lastAt: confirmed.sentAt,
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

  const sendSticker = useCallback(
    async (thread: ChatThread, item: UserEmojiMuc) => {
      const optimistic = createOptimisticChatMessage({
        body: "",
        kind: "sticker",
        imageId: item.cloudflareId,
        imageUrl:
          item.url ?? userEmojiDeliveryUrl(item.cloudflareId, "thumbnail"),
      });
      appendOptimisticMessages(thread, [optimistic]);
      await submitRoomMessage(
        thread,
        { id_emoji_muc: item.id },
        optimistic.id,
      );
    },
    [appendOptimisticMessages, submitRoomMessage],
  );

  const sendPendingCard = useCallback(
    (thread: ChatThread, card: ChatContextCard): Promise<boolean> => {
      setPendingCardByRoom((prev) => {
        if (!prev[thread.roomId]) return prev;
        const next = { ...prev };
        delete next[thread.roomId];
        return next;
      });

      const optimistic: ChatMessage = {
        ...createOptimisticChatMessage({ body: "", kind: "context" }),
        senderUserId: viewerProfileId ?? undefined,
        nguCanh: card,
      };
      appendOptimisticMessages(thread, [optimistic]);

      return (async () => {
        try {
          const res = await fetch(`/api/chat/rooms/${thread.roomId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ngu_canh: card }),
          });
          const json = (await res.json()) as {
            message?: ChatMessage;
            error?: string;
          };
          if (!res.ok || !json.message) {
            throw new Error(json.error ?? "Không gửi được thẻ nội dung.");
          }
          const message = applyChatViewerPerspective(
            [json.message],
            viewerProfileId,
          )[0]!;
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id !== thread.id) return t;
              const messages = reconcileChatMessage(t.messages, message);
              if (viewerProfileId) {
                writeRoomMessagesCache(viewerProfileId, t.roomId, messages);
              }
              return { ...t, messages };
            }),
          );
          return true;
        } catch {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id
                ? {
                    ...t,
                    messages: t.messages.filter((m) => m.id !== optimistic.id),
                  }
                : t,
            ),
          );
          setPendingCardByRoom((prev) =>
            prev[thread.roomId] ? prev : { ...prev, [thread.roomId]: card },
          );
          return false;
        }
      })();
    },
    [appendOptimisticMessages, viewerProfileId],
  );

  const sendMessage = useCallback(() => {
    if (!active || !canSend) return;

    const pendingCard = activePendingCard;
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

    if (!pendingCard && optimistics.length === 0) return;

    setDraft("");
    setPendingImages([]);
    pendingImagesRef.current = [];
    setReplyTarget(null);
    composeByRoomRef.current.set(thread.roomId, { text: "", images: [] });
    inputRef.current?.focus();

    void (async () => {
      if (pendingCard) {
        await sendPendingCard(thread, pendingCard);
      }

      if (optimistics.length === 0) return;

      appendOptimisticMessages(thread, optimistics);
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
              submitRoomMessage(
                thread,
                plan.text!.payload,
                plan.text!.optimistic.id,
              )
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
          if (pendingCard) {
            setPendingCardByRoom((prev) =>
              prev[thread.roomId]
                ? prev
                : { ...prev, [thread.roomId]: pendingCard },
            );
          }
        },
        onFinally: () => {
          for (const image of snapshotImages) {
            pendingFilesByLocalIdRef.current.delete(image.localId);
          }
        },
      }).then((ok) => {
        if (ok) revokeDraftImageUrls(snapshotImages);
      });
    })();
  }, [
    active,
    activePendingCard,
    appendOptimisticMessages,
    canSend,
    draft,
    replyTarget,
    sendableImages,
    sendPendingCard,
    submitAlbumBatch,
    submitRoomMessage,
  ]);

  if (!portalReady) return null;

  const panel = (
    <div ref={chatRootRef} className="cins-chat-root" role="presentation">
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
            <div className="cins-chat-list-head-actions">
              {activeTab === "ban_be" ? (
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Tạo nhóm chat"
                  title="Tạo nhóm chat"
                  onClick={() => setGroupModalOpen(true)}
                >
                  <UserPlus size={18} strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                className="cins-chat-icon-btn"
                aria-label="Đóng"
                onClick={onClose}
              >
                <X size={18} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
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

          {activeTab === "ban_be" ? (
            <div
              className="cins-chat-banbe-filters"
              role="tablist"
              aria-label="Lọc bạn bè"
            >
              {BAN_BE_FILTER_ORDER.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={banBeFilter === filter}
                  className={`cins-chat-banbe-filter${banBeFilter === filter ? " is-active" : ""}`}
                  onClick={() => setBanBeFilter(filter)}
                >
                  {BAN_BE_FILTER_LABEL[filter]}
                  {banBeFilterCounts[filter] > 0 ? (
                    <span className="cins-chat-banbe-filter-count">
                      {banBeFilterCounts[filter]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

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
                    isListPinned={isListPinned(thread.roomId)}
                    isMuted={isRoomMuted(thread.roomId)}
                    canShowMenu={!isPendingRoomId(thread.roomId)}
                    isMenuOpen={threadMenuRoomId === thread.roomId}
                    onMenuOpenChange={(open) =>
                      setThreadMenuRoomId(open ? thread.roomId : null)
                    }
                    onSelect={selectThread}
                    onViewProfile={handleViewProfile}
                    onToggleListPin={(t) => toggleListPin(t.roomId)}
                    onToggleMute={(t) => toggleMuteRoom(t.roomId)}
                    onLeaveGroup={handleLeaveGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onHideThread={handleHideThread}
                  />
                ))}
              </ul>
            ) : (
              <p className="cins-chat-threads-empty">
                {query.trim()
                  ? "Không tìm thấy hội thoại phù hợp."
                  : activeTab === "ban_be" && banBeFilter === "nhom"
                    ? "Chưa có nhóm chat nào."
                    : activeTab === "ban_be" && banBeFilter === "ca_nhan"
                      ? "Chưa có chat cá nhân nào."
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
            {active.isGroup ? (
              <span className="cins-chat-avatar-wrap">
                <ChatGroupAvatar
                  size={36}
                  avatarUrl={active.avatarUrl}
                  members={active.memberAvatars ?? []}
                  editable={Boolean(active.isGroupAdmin)}
                  uploading={uploadingGroupAvatar}
                  onEditClick={() => groupAvatarInputRef.current?.click()}
                />
                <input
                  ref={groupAvatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cins-chat-sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => void handleGroupAvatarFile(e)}
                />
              </span>
            ) : (
              <ChatAvatar
                initial={active.avatarInitial}
                hue={active.avatarHue}
                size={36}
                kind={active.kind}
                verified={active.verified}
                avatarUrl={active.avatarUrl}
              />
            )}
            <div className="cins-chat-convo-meta">
              <span className="cins-chat-convo-title">
                <strong>{active.name}</strong>
                {active.isGroup ? (
                  <span className="cins-chat-kind-pill is-group">Nhóm</span>
                ) : active.kind === "org" ? (
                  <ChatKindPill thread={active} />
                ) : null}
              </span>
              {active.isGroup && active.memberCount ? (
                <span>{active.memberCount} thành viên</span>
              ) : active.online ? (
                <span>
                  <span className="cins-chat-online-dot" aria-hidden />
                  Đang hoạt động
                </span>
              ) : active.kind === "org" && active.role ? (
                <span>{active.role}</span>
              ) : null}
            </div>
            <div className="cins-chat-convo-actions">
              {active.roomId && !isPendingRoomId(active.roomId) ? (
                <button
                  type="button"
                  className={`cins-chat-icon-btn cins-chat-bubble-pin${isRoomPinned(active.roomId) ? " is-active" : ""}`}
                  aria-label={
                    isRoomPinned(active.roomId) ? "Bỏ ghim bubble" : "Ghim bubble"
                  }
                  aria-pressed={isRoomPinned(active.roomId)}
                  title={
                    isRoomPinned(active.roomId) ? "Bỏ ghim bubble" : "Ghim bubble"
                  }
                  onClick={() => togglePinRoom(active.roomId, active)}
                >
                  <PictureInPicture2
                    size={16}
                    strokeWidth={1.9}
                    aria-hidden
                  />
                </button>
              ) : null}
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
                showSenderNames={Boolean(active.isGroup)}
                actionHandlers={messageActionHandlers}
                editingMessageId={editingMessageId}
                editingDraft={editingDraft}
                onEditingDraftChange={setEditingDraft}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setEditingDraft("");
                }}
                renderTheirAvatar={(msg) => (
                  <ChatAvatar
                    initial={
                      active.isGroup && msg.senderAvatarInitial
                        ? msg.senderAvatarInitial
                        : active.avatarInitial
                    }
                    hue={
                      active.isGroup && msg.senderAvatarHue != null
                        ? msg.senderAvatarHue
                        : active.avatarHue
                    }
                    size={active.isGroup ? 32 : 28}
                    kind={active.kind}
                    verified={active.verified}
                    avatarUrl={
                      active.isGroup ? (msg.senderAvatarUrl ?? null) : active.avatarUrl
                    }
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
            {activePendingCard ? (
              <div className="cins-chat-compose-ctx">
                <span className="cins-chat-compose-ctx-media" aria-hidden>
                  {activePendingCard.anh ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      className="cins-chat-compose-ctx-thumb"
                      src={activePendingCard.anh}
                      alt=""
                    />
                  ) : (
                    <MessageSquareQuote size={16} strokeWidth={2} />
                  )}
                </span>
                <div className="cins-chat-compose-ctx-text">
                  <span className="cins-chat-compose-ctx-note">Trao đổi về</span>
                  <strong>{activePendingCard.tieuDe}</strong>
                  {activePendingCard.orgTen ? (
                    <span className="cins-chat-compose-ctx-sub">
                      {activePendingCard.orgTen}
                    </span>
                  ) : activePendingCard.moTa ? (
                    <span className="cins-chat-compose-ctx-sub">
                      {activePendingCard.moTa}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="cins-chat-compose-ctx-remove"
                  aria-label="Bỏ thẻ nội dung"
                  onClick={() =>
                    active
                      ? setPendingCardByRoom((prev) => {
                          if (!prev[active.roomId]) return prev;
                          const next = { ...prev };
                          delete next[active.roomId];
                          return next;
                        })
                      : undefined
                  }
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
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
            {stickerPickerOpen ? (
              <ChatStickerPicker
                onClose={() => setStickerPickerOpen(false)}
                disabled={connecting || isPendingRoom}
                onSend={(item) => {
                  if (!active) return;
                  setStickerPickerOpen(false);
                  void sendSticker(active, item);
                }}
              />
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
                className="cins-chat-attach cins-chat-attach-meme"
                data-sticker-trigger
                aria-label="Meme của tôi"
                aria-expanded={stickerPickerOpen}
                disabled={connecting || isPendingRoom}
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
                onFocus={() => {
                  // Tránh browser đẩy cả overlay; giữ khung theo visualViewport.
                  window.scrollTo(0, 0);
                  window.setTimeout(() => {
                    window.scrollTo(0, 0);
                    scrollMessagesToBottom("auto");
                  }, 50);
                  window.setTimeout(() => {
                    scrollMessagesToBottom("auto");
                  }, 300);
                }}
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

      <ChatCreateGroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );

  return createPortal(panel, document.body);
}
