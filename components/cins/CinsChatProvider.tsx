"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/use-t";

import { CinsChatDock } from "@/components/cins/CinsChatDock";
import { ChatIncomingCallHost } from "@/components/cins/ChatIncomingCallHost";
import { CinsChatOverlay } from "@/components/cins/CinsChatOverlay";
import { scheduleWhenIdle } from "@/lib/client/schedule-when-idle";
import {
  chatInboxHref,
  chatRoomHref,
  chatRoomQueryMatchesRoom,
  readChatChildFromLocation,
} from "@/lib/chat/chat-history";
import { isChatPagePath } from "@/lib/chat/chat-page-path";
import {
  readChatThreadsCache,
  readRoomMessagesCache,
  writeRoomMessagesCache,
  type ChatThreadsSnapshot,
} from "@/lib/chat/chat-session-cache";
import { sumUnreadExcludingRoom } from "@/lib/chat/unread-focus";
import {
  prefetchChatThreads,
  prefetchRoomMessages,
} from "@/lib/chat/chat-prefetch";
import {
  applyDocumentUnreadBadge,
  applyDocumentUnreadTitle,
} from "@/lib/chat/document-unread-badge";
import { buildOptimisticDirectThread } from "@/lib/chat/optimistic-thread";
import {
  readHiddenRoomIds,
  writeHiddenRoomIds,
} from "@/lib/chat/hidden-rooms-storage";
import {
  readMutedRoomIds,
  writeMutedRoomIds,
} from "@/lib/chat/muted-rooms-storage";
import {
  readPinnedListRoomIds,
  writePinnedListRoomIds,
} from "@/lib/chat/pinned-list-rooms-storage";
import {
  readPinnedRoomIds,
  writePinnedRoomIds,
} from "@/lib/chat/pinned-rooms-storage";
import {
  toRealtimeMessageEvent,
  type ChatRealtimeMessageEvent,
} from "@/lib/chat/realtime";
import { playIncomingMessageSound } from "@/lib/chat/play-incoming-message-sound";
import { hasShareDragData } from "@/lib/cins/share-drag";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { useChatUserChannel } from "@/lib/chat/use-chat-user-channel";
import type { ChatEnvelope } from "@/lib/chat/publish-types";
import {
  CHAT_ROUTE_HREF,
  CINS_HISTORY_CHAT,
  CINS_HISTORY_CHAT_ROOM,
  pushOverlayHistory,
} from "@/lib/navigation/overlay-history";
import type {
  ChatContextCard,
  ChatLaunchState,
  ChatMessage,
  ChatOrgKind,
  ChatPeerPreview,
  ChatThread,
  ChatThreadGroup,
} from "@/lib/chat/types";

import "@/app/cins-chat-overlay.css";

type OpenChatOrgPreview = {
  name?: string;
  avatarUrl?: string | null;
  orgKind?: ChatOrgKind;
};

type OpenChatOptions = {
  targetUserId?: string;
  peerPreview?: Omit<ChatPeerPreview, "userId">;
  roomId?: string;
  /**
   * Snapshot hội thoại đầy đủ (vd. mini «Mở rộng»).
   * Tránh stub `Hội thoại`/`?` ghi đè tên, nhóm, tin đã hydrate.
   */
  thread?: ChatThread;
  tab?: ChatThreadGroup;
  /** Sub-filter tab «Tổ chức»: tất cả / của tôi / tham gia. */
  toChucFilter?: "all" | "cua_toi" | "tham_gia";
  /** Mở hội thoại với 1 TỔ CHỨC (user → org). */
  orgId?: string;
  /** Xem trước tổ chức khi đang resolve phòng. */
  orgPreview?: OpenChatOrgPreview;
  /** Card ngữ cảnh đính vào hội thoại (tuyển dụng/sự kiện/tuyển sinh). */
  nguCanh?: ChatContextCard | null;
  /** Tự gửi card ngữ cảnh khi phòng sẵn sàng. */
  autoSendNguCanh?: boolean;
  /** Ảnh Cloudflare — gửi kèm sau card (biên lai đơn shop). */
  autoSendImageId?: string | null;
  autoSendImageUrl?: string | null;
};

type ChatFocusSurface = "full" | "mini" | null;

type ChatMessageListener = (event: ChatRealtimeMessageEvent) => void;

type CinsChatContextValue = {
  open: boolean;
  /** Overlay fill vùng shell (giữ topbar/sidebar) — gắn URL `/chat`. */
  shellFill: boolean;
  viewerProfileId: string | null;
  totalUnread: number;
  openChat: (options?: OpenChatOptions) => Promise<void>;
  /** Đóng panel. Nếu `nextHref` — điều hướng tới đó (không `back`/`replace("/")` đua với nav). */
  closeChat: (nextHref?: string) => void;
  /**
   * Lớp history hội thoại con (mobile stack). Back → list `/chat`.
   * `inbox` = hộp thư người lạ; `{ roomId, query }` = phòng (`?room=slug-xxxxxxxx`).
   */
  enterChatChildView: (
    child: "inbox" | { roomId: string; query: string },
  ) => void;
  /** Back về list. `true` nếu đã `history.back()`. */
  leaveChatChildView: () => boolean;
  refreshUnread: () => Promise<void>;
  /** Setter React thô — consumer được dùng dạng updater để tránh đọc state cũ. */
  setTotalUnread: Dispatch<SetStateAction<number>>;
  subscribeChatMessages: (listener: ChatMessageListener) => () => void;
  setChatFocus: (roomId: string | null, surface: ChatFocusSurface) => void;
  getCachedThreads: () => ChatThreadsSnapshot | null;
  getCachedRoomMessages: (roomId: string) => ChatMessage[] | null;
  /**
   * `maxAgeMs` — tuổi cache RAM tối đa mà caller chấp nhận. Đường
   * `visibilitychange`/`focus` truyền mức ngắn (~5s) để không đọc cache 45s cũ,
   * nhưng vẫn không nã `/api/chat/threads` (endpoint đắt nhất của chat).
   */
  prefetchChatData: (opts?: {
    maxAgeMs?: number;
  }) => Promise<ChatThreadsSnapshot | null>;
  prefetchRoomMessages: (roomId: string) => Promise<ChatMessage[] | null>;
  /** Ghim bubble nổi (mini dock). */
  pinnedRoomIds: string[];
  pinnedThreadSnapshots: Record<string, ChatThread>;
  isRoomPinned: (roomId: string) => boolean;
  togglePinRoom: (roomId: string, thread?: ChatThread) => void;
  unpinRoom: (roomId: string) => void;
  /**
   * Ghim room + đóng panel + yêu cầu FloatingStack mở bubble mini.
   * Dùng khi bấm "Ghim bubble" trong overlay.
   * `relatedThreads` — snapshot phụ (vd. nhóm cha của project con) để bubble/header lookup.
   */
  popOutRoomToBubble: (
    thread: ChatThread,
    relatedThreads?: ChatThread[],
  ) => void;
  /**
   * Mở hội thoại 1-1 dạng **bubble mini** (không bung panel lớn) — vd. sau khi
   * buyer gửi đơn cho shop. Lỗi mở phòng chỉ im lặng, không chặn luồng gọi.
   */
  openBubbleChatWithUser: (targetUserId: string) => Promise<void>;
  /** Hội thoại đang chờ mở thành bubble (sau pop-out). */
  pendingBubbleThread: ChatThread | null;
  clearPendingBubble: () => void;
  /** Ghim lên đầu danh sách sidebar. */
  pinnedListRoomIds: string[];
  isListPinned: (roomId: string) => boolean;
  toggleListPin: (roomId: string) => void;
  unpinListRoom: (roomId: string) => void;
  /** Tắt thông báo theo phòng (client-side). */
  mutedRoomIds: string[];
  isRoomMuted: (roomId: string) => boolean;
  toggleMuteRoom: (roomId: string) => void;
  /** Ẩn hội thoại khỏi sidebar (client-side). */
  hiddenRoomIds: string[];
  hideRoom: (roomId: string) => void;
  unhideRoom: (roomId: string) => void;
  /** Đang kéo nội dung chia sẻ — overlay hiện dạng cột danh sách nhận thả. */
  shareDropMode: boolean;
  /** Overlay gọi khi đã nhận drop thành công (giữ overlay mở, thoát drop mode). */
  completeShareDrop: () => void;
};

/** Tab/cửa sổ hiện lại — mức cũ tối đa của cache thread còn chấp nhận được. */
const TAB_RETURN_MAX_AGE_MS = 5_000;

const CinsChatContext = createContext<CinsChatContextValue | null>(null);

export function useCinsChatContext() {
  return useContext(CinsChatContext);
}

export function useCinsChat() {
  const ctx = useCinsChatContext();
  if (!ctx) {
    throw new Error("useCinsChat must be used within CinsChatProvider");
  }
  return ctx;
}

export function CinsChatProvider({
  children,
  viewerProfileId,
}: {
  children: ReactNode;
  viewerProfileId: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [shellFill, setShellFill] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [launch, setLaunch] = useState<ChatLaunchState | null>(null);
  const [pinnedRoomIds, setPinnedRoomIds] = useState<string[]>([]);
  const [pinnedListRoomIds, setPinnedListRoomIds] = useState<string[]>([]);
  const [mutedRoomIds, setMutedRoomIds] = useState<string[]>([]);
  const [hiddenRoomIds, setHiddenRoomIds] = useState<string[]>([]);
  const [pinnedThreadSnapshots, setPinnedThreadSnapshots] = useState<
    Record<string, ChatThread>
  >({});
  const [pendingBubbleThread, setPendingBubbleThread] =
    useState<ChatThread | null>(null);
  const [shareDropMode, setShareDropMode] = useState(false);
  /** Overlay có đang mở sẵn trước khi kéo không — kéo hụt thì đóng lại. */
  const shareDropWasOpenRef = useRef(false);
  const shareDropDoneRef = useRef(false);
  const shareDropActiveRef = useRef(false);
  const openRef = useRef(false);
  /** Đã pushState `/chat` — Back / đóng UI gọi history.back(). */
  const chatHistoryPushedRef = useRef(false);
  /** Đã pushState `?room=` / `?inbox=` — Back về list trước. */
  const chatRoomPushedRef = useRef(false);
  /** Bỏ qua popstate ngay sau history.back() từ closeChat. */
  const ignoreChatPopRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const listenersRef = useRef(new Set<ChatMessageListener>());
  const focusRef = useRef<{ roomId: string | null; surface: ChatFocusSurface }>({
    roomId: null,
    surface: null,
  });
  /** Chống beep/unread nhân đôi khi envelope + CDC cùng báo một tin. */
  const notifiedIdsRef = useRef(new Map<string, number>());
  const takeIncomingNotify = useCallback((messageId: string): boolean => {
    const now = Date.now();
    const prev = notifiedIdsRef.current.get(messageId);
    if (prev && now - prev < 120_000) return false;
    notifiedIdsRef.current.set(messageId, now);
    if (notifiedIdsRef.current.size > 400) {
      for (const [id, at] of notifiedIdsRef.current) {
        if (now - at > 120_000) notifiedIdsRef.current.delete(id);
      }
    }
    return true;
  }, []);

  const applyUnreadFromThreads = useCallback(
    (threads: Array<{ roomId: string; unread: number }>) => {
      const focusId = focusRef.current.surface
        ? focusRef.current.roomId
        : null;
      setTotalUnread(sumUnreadExcludingRoom(threads, focusId));
    },
    [],
  );

  const refreshUnread = useCallback(async () => {
    if (!viewerProfileId) {
      setTotalUnread(0);
      return;
    }
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        threads?: ChatThread[];
        totalUnread?: number;
      };
      if (json.threads?.length) {
        applyUnreadFromThreads(json.threads);
      } else {
        setTotalUnread(json.totalUnread ?? 0);
      }
    } catch {
      /* ignore */
    }
  }, [applyUnreadFromThreads, viewerProfileId]);

  const getCachedThreads = useCallback((): ChatThreadsSnapshot | null => {
    return readChatThreadsCache(viewerProfileId);
  }, [viewerProfileId]);

  const getCachedRoomMessages = useCallback(
    (roomId: string): ChatMessage[] | null => {
      return readRoomMessagesCache(viewerProfileId, roomId);
    },
    [viewerProfileId],
  );

  const prefetchChatData = useCallback(
    async (opts?: {
      maxAgeMs?: number;
    }): Promise<ChatThreadsSnapshot | null> => {
      if (!viewerProfileId) return null;
      const snapshot = await prefetchChatThreads(viewerProfileId, {
        maxAgeMs: opts?.maxAgeMs,
      });
      if (snapshot) {
        applyUnreadFromThreads(snapshot.threads);
      }
      return snapshot;
    },
    [applyUnreadFromThreads, viewerProfileId],
  );

  const prefetchRoomMessagesForViewer = useCallback(
    async (roomId: string): Promise<ChatMessage[] | null> => {
      if (!viewerProfileId) return null;
      return prefetchRoomMessages(viewerProfileId, roomId);
    },
    [viewerProfileId],
  );

  useEffect(() => {
    if (!viewerProfileId) {
      setPinnedRoomIds([]);
      setPinnedListRoomIds([]);
      setMutedRoomIds([]);
      setHiddenRoomIds([]);
      setPinnedThreadSnapshots({});
      return;
    }
    setPinnedRoomIds(readPinnedRoomIds(viewerProfileId));
    setPinnedListRoomIds(readPinnedListRoomIds(viewerProfileId));
    setMutedRoomIds(readMutedRoomIds(viewerProfileId));
    setHiddenRoomIds(readHiddenRoomIds(viewerProfileId));
  }, [viewerProfileId]);

  const isRoomPinned = useCallback(
    (roomId: string) => pinnedRoomIds.includes(roomId),
    [pinnedRoomIds],
  );

  const unpinRoom = useCallback(
    (roomId: string) => {
      if (!viewerProfileId) return;
      setPinnedRoomIds((prev) => {
        const next = prev.filter((id) => id !== roomId);
        writePinnedRoomIds(viewerProfileId, next);
        return next;
      });
      setPinnedThreadSnapshots((prev) => {
        if (!(roomId in prev)) return prev;
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    },
    [viewerProfileId],
  );

  const togglePinRoom = useCallback(
    (roomId: string, thread?: ChatThread) => {
      if (!viewerProfileId || !roomId) return;
      const pinning = !pinnedRoomIds.includes(roomId);
      if (pinning) {
        setPinnedRoomIds((prev) => {
          const next = [...prev.filter((id) => id !== roomId), roomId];
          writePinnedRoomIds(viewerProfileId, next);
          return next;
        });
        if (thread) {
          setPinnedThreadSnapshots((prev) => ({ ...prev, [roomId]: thread }));
        }
      } else {
        unpinRoom(roomId);
      }
    },
    [pinnedRoomIds, unpinRoom, viewerProfileId],
  );

  const clearPendingBubble = useCallback(() => {
    setPendingBubbleThread(null);
  }, []);

  const popChatHistoryToUnderlying = useCallback(() => {
    const steps =
      (chatRoomPushedRef.current ? 1 : 0) +
      (chatHistoryPushedRef.current ? 1 : 0);
    chatRoomPushedRef.current = false;
    chatHistoryPushedRef.current = false;
    if (steps <= 0 || typeof window === "undefined") return;
    ignoreChatPopRef.current = true;
    if (steps === 1) window.history.back();
    else window.history.go(-steps);
  }, []);

  const popOutRoomToBubble = useCallback(
    (thread: ChatThread, relatedThreads?: ChatThread[]) => {
      if (!viewerProfileId || !thread.roomId) return;
      const roomId = thread.roomId;
      /* Flush tin overlay → cache trước khi mini mở lại (tránh state cũ). */
      if (thread.messages?.length) {
        writeRoomMessagesCache(viewerProfileId, roomId, thread.messages);
      }
      setPinnedRoomIds((prev) => {
        if (prev.includes(roomId)) return prev;
        const next = [...prev.filter((id) => id !== roomId), roomId];
        writePinnedRoomIds(viewerProfileId, next);
        return next;
      });
      setPinnedThreadSnapshots((prev) => {
        const next = { ...prev, [roomId]: thread };
        for (const related of relatedThreads ?? []) {
          if (!related.roomId) continue;
          next[related.roomId] = related;
        }
        return next;
      });
      setPendingBubbleThread(thread);
      setOpen(false);
      setLaunch(null);
      setShellFill(false);
      popChatHistoryToUnderlying();
      void refreshUnread();
    },
    [popChatHistoryToUnderlying, refreshUnread, viewerProfileId],
  );

  const openBubbleChatWithUser = useCallback(
    async (targetUserId: string) => {
      const peerId = targetUserId?.trim();
      if (!viewerProfileId || !peerId || peerId === viewerProfileId) return;
      try {
        const res = await fetch("/api/chat/rooms/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_nguoi: peerId }),
        });
        const json = (await res.json().catch(() => null)) as {
          thread?: ChatThread;
        } | null;
        if (!res.ok || !json?.thread?.roomId) return;
        popOutRoomToBubble(json.thread);
      } catch {
        /* Không mở được bubble — luồng gọi (vd. gửi đơn) vẫn coi như xong. */
      }
    },
    [popOutRoomToBubble, viewerProfileId],
  );

  const isListPinned = useCallback(
    (roomId: string) => pinnedListRoomIds.includes(roomId),
    [pinnedListRoomIds],
  );

  const unpinListRoom = useCallback(
    (roomId: string) => {
      if (!viewerProfileId) return;
      setPinnedListRoomIds((prev) => {
        const next = prev.filter((id) => id !== roomId);
        writePinnedListRoomIds(viewerProfileId, next);
        return next;
      });
    },
    [viewerProfileId],
  );

  const toggleListPin = useCallback(
    (roomId: string) => {
      if (!viewerProfileId || !roomId) return;
      setPinnedListRoomIds((prev) => {
        const next = prev.includes(roomId)
          ? prev.filter((id) => id !== roomId)
          : [...prev.filter((id) => id !== roomId), roomId];
        writePinnedListRoomIds(viewerProfileId, next);
        return next;
      });
    },
    [viewerProfileId],
  );

  const isRoomMuted = useCallback(
    (roomId: string) => mutedRoomIds.includes(roomId),
    [mutedRoomIds],
  );

  const toggleMuteRoom = useCallback(
    (roomId: string) => {
      if (!viewerProfileId || !roomId) return;
      setMutedRoomIds((prev) => {
        const next = prev.includes(roomId)
          ? prev.filter((id) => id !== roomId)
          : [...prev.filter((id) => id !== roomId), roomId];
        writeMutedRoomIds(viewerProfileId, next);
        return next;
      });
    },
    [viewerProfileId],
  );

  const hideRoom = useCallback(
    (roomId: string) => {
      if (!viewerProfileId || !roomId) return;
      setHiddenRoomIds((prev) => {
        if (prev.includes(roomId)) return prev;
        const next = [...prev, roomId];
        writeHiddenRoomIds(viewerProfileId, next);
        return next;
      });
    },
    [viewerProfileId],
  );

  const unhideRoom = useCallback(
    (roomId: string) => {
      if (!viewerProfileId || !roomId) return;
      setHiddenRoomIds((prev) => {
        if (!prev.includes(roomId)) return prev;
        const next = prev.filter((id) => id !== roomId);
        writeHiddenRoomIds(viewerProfileId, next);
        return next;
      });
    },
    [viewerProfileId],
  );

  useEffect(() => {
    if (!viewerProfileId) {
      setTotalUnread(0);
      return;
    }

    const cached = readChatThreadsCache(viewerProfileId);
    if (cached) {
      applyUnreadFromThreads(cached.threads);
    }

    const cancelIdle = scheduleWhenIdle(() => {
      void prefetchChatData();
    });

    const id = window.setInterval(() => {
      void prefetchChatData();
    }, 120_000);

    /* Tab hiện lại: cache 45s là quá cũ cho badge; 5s vừa mới vừa không hammer. */
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void prefetchChatData({ maxAgeMs: TAB_RETURN_MAX_AGE_MS });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelIdle();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [prefetchChatData, viewerProfileId]);

  /* Tab trình duyệt: `(N) title` + badge favicon khi còn tin chưa đọc. */
  useEffect(() => {
    const count = viewerProfileId ? totalUnread : 0;
    applyDocumentUnreadBadge(count);

    const titleEl = document.querySelector("title");
    if (!titleEl) return;

    const obs = new MutationObserver(() => {
      applyDocumentUnreadTitle(count);
    });
    obs.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => obs.disconnect();
  }, [totalUnread, viewerProfileId]);

  const subscribeChatMessages = useCallback((listener: ChatMessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const setChatFocus = useCallback(
    (roomId: string | null, surface: ChatFocusSurface) => {
      focusRef.current = { roomId, surface };
      const cached = viewerProfileId
        ? readChatThreadsCache(viewerProfileId)
        : null;
      if (cached) {
        applyUnreadFromThreads(cached.threads);
      }
    },
    [applyUnreadFromThreads, viewerProfileId],
  );

  const handleRealtimeInsert = useCallback(
    (row: Parameters<typeof toRealtimeMessageEvent>[0]) => {
      if (!viewerProfileId) return;

      const event = toRealtimeMessageEvent(row, viewerProfileId, "insert");
      if (!event) return;
      for (const listener of listenersRef.current) {
        listener(event);
      }

      const fromPeer = event.senderId !== viewerProfileId;
      if (!fromPeer) return;
      if (!takeIncomingNotify(event.message.id)) return;

      if (event.message.kind === "chao_lop" || event.message.chaoLop) {
        return;
      }

      /* Cuộc gọi đến → chuông riêng (ChatIncomingCallHost), không beep tin nhắn. */
      if (event.message.kind === "cuoc_goi" || event.message.cuocGoi) {
        const focus = focusRef.current;
        const isViewing =
          focus.surface !== null && focus.roomId === event.roomId;
        if (!isViewing) {
          setTotalUnread((count) => count + 1);
        }
        return;
      }

      playIncomingMessageSound({ muted: isRoomMuted(event.roomId) });

      const focus = focusRef.current;
      const isViewing =
        focus.surface !== null && focus.roomId === event.roomId;

      if (!isViewing) {
        setTotalUnread((count) => count + 1);
      }
    },
    [viewerProfileId, isRoomMuted, takeIncomingNotify],
  );

  const handleRealtimeUpdate = useCallback(
    (row: Parameters<typeof toRealtimeMessageEvent>[0]) => {
      if (!viewerProfileId) return;

      const event = toRealtimeMessageEvent(row, viewerProfileId, "update");
      if (!event) return;
      for (const listener of listenersRef.current) {
        listener(event);
      }

      /* Shop bump đơn → người mua nhận như tin mới (không INSERT trùng). */
      const fromPeer = event.senderId !== viewerProfileId;
      if (
        !fromPeer ||
        (event.message.nguCanh?.loai !== "don_hang" &&
          event.message.nguCanh?.loai !== "don_hoc_phi")
      ) {
        return;
      }
      if (!takeIncomingNotify(event.message.id)) return;
      playIncomingMessageSound({ muted: isRoomMuted(event.roomId) });
      const focus = focusRef.current;
      const isViewing =
        focus.surface !== null && focus.roomId === event.roomId;
      if (!isViewing) {
        setTotalUnread((count) => count + 1);
      }
    },
    [viewerProfileId, isRoomMuted, takeIncomingNotify],
  );

  const handleEnvelope = useCallback(
    (envelope: ChatEnvelope) => {
      if (!viewerProfileId) return;
      if (envelope.senderId === viewerProfileId) return;
      if (envelope.kind === "chao_lop") return;
      if (!takeIncomingNotify(envelope.messageId)) return;

      if (envelope.kind === "cuoc_goi") {
        const focus = focusRef.current;
        const isViewing =
          focus.surface !== null && focus.roomId === envelope.roomId;
        if (!isViewing) setTotalUnread((count) => count + 1);
        return;
      }

      playIncomingMessageSound({ muted: isRoomMuted(envelope.roomId) });
      const focus = focusRef.current;
      const isViewing =
        focus.surface !== null && focus.roomId === envelope.roomId;
      if (!isViewing) setTotalUnread((count) => count + 1);
    },
    [viewerProfileId, isRoomMuted, takeIncomingNotify],
  );

  useChatRealtime(viewerProfileId, handleRealtimeInsert, handleRealtimeUpdate);
  useChatUserChannel(viewerProfileId, handleEnvelope);

  /** Mở panel + sync URL `/chat` (pushState — không remount trang nền). */
  const beginOpenPanel = useCallback(() => {
    setOpen(true);
    setShellFill(true);
    if (typeof window === "undefined") return;
    if (isChatPagePath(window.location.pathname)) return;
    if (chatHistoryPushedRef.current) return;
    pushOverlayHistory(CINS_HISTORY_CHAT, "open", CHAT_ROUTE_HREF);
    chatHistoryPushedRef.current = true;
  }, []);

  const historyStateBag = (): Record<string, unknown> => {
    if (typeof window === "undefined") return {};
    return typeof window.history.state === "object" && window.history.state
      ? (window.history.state as Record<string, unknown>)
      : {};
  };

  const enterChatChildView = useCallback(
    (child: "inbox" | { roomId: string; query: string }) => {
      if (typeof window === "undefined") return;

      const href =
        child === "inbox" ? chatInboxHref() : chatRoomHref(child.query);
      const id = child === "inbox" ? "inbox" : child.query;
      const current = readChatChildFromLocation();
      const alreadyOnChild =
        child === "inbox"
          ? current.kind === "inbox"
          : current.kind === "room" &&
            chatRoomQueryMatchesRoom(current.query, child.roomId);

      if (alreadyOnChild && chatRoomPushedRef.current) {
        if (current.kind === "room" && current.query !== id) {
          window.history.replaceState(
            { ...historyStateBag(), [CINS_HISTORY_CHAT_ROOM]: id },
            "",
            href,
          );
        }
        return;
      }

      if (alreadyOnChild && !chatRoomPushedRef.current) {
        window.history.replaceState(
          { ...historyStateBag(), [CINS_HISTORY_CHAT]: "page" },
          "",
          CHAT_ROUTE_HREF,
        );
        pushOverlayHistory(CINS_HISTORY_CHAT_ROOM, id, href);
        chatRoomPushedRef.current = true;
        return;
      }

      if (chatRoomPushedRef.current) {
        window.history.replaceState(
          { ...historyStateBag(), [CINS_HISTORY_CHAT_ROOM]: id },
          "",
          href,
        );
        return;
      }

      pushOverlayHistory(CINS_HISTORY_CHAT_ROOM, id, href);
      chatRoomPushedRef.current = true;
    },
    [],
  );

  const leaveChatChildView = useCallback((): boolean => {
    if (!chatRoomPushedRef.current) return false;
    chatRoomPushedRef.current = false;
    window.history.back();
    return true;
  }, []);

  /** Đóng panel + gỡ entry `/chat` đã push (không navigate hard page). */
  const dismissOpenPanel = useCallback(() => {
    setOpen(false);
    setLaunch(null);
    setShellFill(false);
    popChatHistoryToUnderlying();
  }, [popChatHistoryToUnderlying]);

  const closeChat = useCallback(
    (nextHref?: string) => {
      void refreshUnread();

      const dest = nextHref?.trim();
      if (dest) {
        setOpen(false);
        setLaunch(null);
        setShellFill(false);
        chatRoomPushedRef.current = false;
        /* Một lần nav — tránh history.back()/replace("/") đua với push profile. */
        if (chatHistoryPushedRef.current) {
          chatHistoryPushedRef.current = false;
          router.replace(dest);
          return;
        }
        if (isChatPagePath(window.location.pathname)) {
          router.replace(dest);
          return;
        }
        router.push(dest);
        return;
      }

      if (chatHistoryPushedRef.current) {
        setOpen(false);
        setLaunch(null);
        setShellFill(false);
        popChatHistoryToUnderlying();
        return;
      }
      /* Hard `/chat` (gõ URL / refresh / tab mới) — về trang chủ, overlay giữ đến khi unload. */
      if (isChatPagePath(window.location.pathname)) {
        chatRoomPushedRef.current = false;
        window.location.assign("/");
        return;
      }

      setOpen(false);
      setLaunch(null);
      setShellFill(false);
    },
    [popChatHistoryToUnderlying, refreshUnread, router],
  );

  /* Hard visit `/chat` — mở overlay trên shell trang đó. */
  useEffect(() => {
    if (!viewerProfileId || !isChatPagePath(pathname)) return;
    setOpen(true);
    setShellFill(true);
  }, [pathname, viewerProfileId]);

  /* Back/Forward: còn `/chat` → list hoặc phòng; rời `/chat` → đóng overlay. */
  useEffect(() => {
    const onPop = () => {
      if (ignoreChatPopRef.current) {
        ignoreChatPopRef.current = false;
        return;
      }
      if (!openRef.current) return;
      if (isChatPagePath(window.location.pathname)) {
        chatRoomPushedRef.current =
          readChatChildFromLocation().kind !== "list";
        return;
      }
      chatHistoryPushedRef.current = false;
      chatRoomPushedRef.current = false;
      setOpen(false);
      setLaunch(null);
      setShellFill(false);
      void refreshUnread();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [refreshUnread]);

  const resolveDirectRoom = useCallback(
    async (
      targetUserId: string,
      opts?: {
        nguCanh?: ChatContextCard | null;
        autoSendNguCanh?: boolean;
        autoSendImageId?: string | null;
        autoSendImageUrl?: string | null;
      },
    ) => {
      const res = await fetch("/api/chat/rooms/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_nguoi: targetUserId }),
      });
      const json = (await res.json()) as { thread?: ChatThread; error?: string };
      if (!res.ok || !json.thread) {
        throw new Error(json.error ?? "Không mở được hội thoại.");
      }

      const nguCanh = opts?.nguCanh ?? null;
      setLaunch({
        thread: json.thread,
        tab: json.thread.group,
        resolving: false,
        nguCanh,
        autoSendNguCanh: Boolean(opts?.autoSendNguCanh && nguCanh),
        autoSendImageId: opts?.autoSendImageId ?? null,
        autoSendImageUrl: opts?.autoSendImageUrl ?? null,
      });
      return json.thread;
    },
    [],
  );

  const resolveOrgRoom = useCallback(
    async (orgId: string, nguCanh?: ChatContextCard | null) => {
      const res = await fetch("/api/chat/rooms/open-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, nguCanh: nguCanh ?? null }),
      });
      const json = (await res.json()) as {
        thread?: ChatThread;
        nguCanh?: ChatContextCard | null;
        error?: string;
      };
      if (!res.ok || !json.thread) {
        throw new Error(json.error ?? "Không mở được hội thoại với tổ chức.");
      }

      setLaunch({
        thread: json.thread,
        tab: "to_chuc",
        resolving: false,
        nguCanh: json.nguCanh ?? nguCanh ?? null,
      });
      return json.thread;
    },
    [],
  );

  const openChat = useCallback(
    async (options?: OpenChatOptions) => {
      if (!viewerProfileId) {
        router.push("/login");
        return;
      }

      if (options?.orgId) {
        const optimistic: ChatThread = {
          id: `org:${options.orgId}`,
          roomId: `org:${options.orgId}`,
          orgId: options.orgId,
          name: options.orgPreview?.name ?? t("org.loai.org"),
          group: "to_chuc",
          kind: "org",
          orgKind: options.orgPreview?.orgKind,
          verified: true,
          role: t("org.loai.org"),
          avatarInitial: (options.orgPreview?.name ?? "T").slice(0, 1).toUpperCase(),
          avatarHue: 210,
          avatarUrl: options.orgPreview?.avatarUrl ?? null,
          preview: "",
          lastAt: new Date().toISOString(),
          unread: 0,
          messages: [],
        };
        setLaunch({
          thread: optimistic,
          tab: "to_chuc",
          resolving: true,
          nguCanh: options.nguCanh ?? null,
        });
        beginOpenPanel();

        try {
          await resolveOrgRoom(options.orgId, options.nguCanh);
        } catch (error) {
          dismissOpenPanel();
          throw error;
        }
        return;
      }

      if (options?.targetUserId) {
        const peer: ChatPeerPreview = {
          userId: options.targetUserId,
          name: options.peerPreview?.name ?? "Người dùng",
          slug: options.peerPreview?.slug,
          role: options.peerPreview?.role,
          avatarInitial: options.peerPreview?.avatarInitial,
          avatarHue: options.peerPreview?.avatarHue,
          avatarUrl: options.peerPreview?.avatarUrl,
        };
        const optimistic = buildOptimisticDirectThread(peer, options.tab ?? "nguoi_la");
        const nguCanh = options.nguCanh ?? null;
        const autoSendNguCanh = Boolean(options.autoSendNguCanh && nguCanh);
        const autoSendImageId = options.autoSendImageId?.trim() || null;
        const autoSendImageUrl = options.autoSendImageUrl?.trim() || null;

        setLaunch({
          thread: optimistic,
          tab: optimistic.group,
          resolving: true,
          nguCanh,
          autoSendNguCanh,
          autoSendImageId,
          autoSendImageUrl,
        });
        beginOpenPanel();

        try {
          await resolveDirectRoom(options.targetUserId, {
            nguCanh,
            autoSendNguCanh,
            autoSendImageId,
            autoSendImageUrl,
          });
        } catch (error) {
          dismissOpenPanel();
          throw error;
        }
        return;
      }

      if (options?.thread) {
        setLaunch({
          thread: options.thread,
          tab: options.tab ?? options.thread.group,
          toChucFilter: options.toChucFilter,
        });
        beginOpenPanel();
        return;
      }

      if (options?.roomId) {
        const pinned = pinnedThreadSnapshots[options.roomId];
        setLaunch({
          thread: pinned
            ? { ...pinned }
            : {
                id: options.roomId,
                roomId: options.roomId,
                name: "Hội thoại",
                group: options.tab ?? "ban_be",
                kind: "user",
                role: "",
                avatarInitial: "?",
                avatarHue: 210,
                preview: "",
                lastAt: new Date().toISOString(),
                unread: 0,
                messages: [],
              },
          tab: options.tab ?? pinned?.group,
          toChucFilter: options.toChucFilter,
        });
        beginOpenPanel();
        return;
      }

      if (options?.tab || options?.toChucFilter) {
        setLaunch({
          thread: {
            id: "__open_list__",
            roomId: "__open_list__",
            name: "",
            group: options.tab ?? "ban_be",
            kind: "user",
            role: "",
            avatarInitial: "?",
            avatarHue: 210,
            preview: "",
            lastAt: new Date(0).toISOString(),
            unread: 0,
            messages: [],
          },
          tab: options.tab,
          toChucFilter: options.toChucFilter,
        });
        beginOpenPanel();
        return;
      }

      setLaunch(null);
      beginOpenPanel();
    },
    [
      beginOpenPanel,
      dismissOpenPanel,
      pinnedThreadSnapshots,
      resolveDirectRoom,
      resolveOrgRoom,
      router,
      viewerProfileId,
    ],
  );

  /* ---- Kéo-thả chia sẻ (desktop): dragstart payload CINs → mở overlay drop mode ---- */

  const completeShareDrop = useCallback(() => {
    shareDropDoneRef.current = true;
    setShareDropMode(false);
  }, []);

  useEffect(() => {
    if (!viewerProfileId) return;

    const onDragEnter = (event: globalThis.DragEvent) => {
      if (!hasShareDragData(event.dataTransfer)) return;
      if (shareDropActiveRef.current) return;
      shareDropActiveRef.current = true;
      shareDropDoneRef.current = false;
      shareDropWasOpenRef.current = openRef.current;
      setShareDropMode(true);
      beginOpenPanel();
    };

    const onDragEnd = () => {
      if (!shareDropActiveRef.current) return;
      shareDropActiveRef.current = false;
      setShareDropMode(false);
      if (!shareDropDoneRef.current && !shareDropWasOpenRef.current) {
        dismissOpenPanel();
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragend", onDragEnd);
    // Thả ra ngoài vùng nhận (trình duyệt hủy) — drop không bubble tới row.
    window.addEventListener("drop", onDragEnd);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("drop", onDragEnd);
    };
  }, [beginOpenPanel, dismissOpenPanel, viewerProfileId]);

  const value = useMemo(
    () => ({
      open,
      shellFill,
      viewerProfileId,
      totalUnread,
      openChat,
      closeChat,
      enterChatChildView,
      leaveChatChildView,
      refreshUnread,
      setTotalUnread,
      subscribeChatMessages,
      setChatFocus,
      getCachedThreads,
      getCachedRoomMessages,
      prefetchChatData,
      prefetchRoomMessages: prefetchRoomMessagesForViewer,
      pinnedRoomIds,
      pinnedThreadSnapshots,
      isRoomPinned,
      togglePinRoom,
      unpinRoom,
      popOutRoomToBubble,
      openBubbleChatWithUser,
      pendingBubbleThread,
      clearPendingBubble,
      pinnedListRoomIds,
      isListPinned,
      toggleListPin,
      unpinListRoom,
      mutedRoomIds,
      isRoomMuted,
      toggleMuteRoom,
      hiddenRoomIds,
      hideRoom,
      unhideRoom,
      shareDropMode,
      completeShareDrop,
    }),
    [
      open,
      shellFill,
      viewerProfileId,
      totalUnread,
      openChat,
      closeChat,
      enterChatChildView,
      leaveChatChildView,
      refreshUnread,
      subscribeChatMessages,
      setChatFocus,
      getCachedThreads,
      getCachedRoomMessages,
      prefetchChatData,
      prefetchRoomMessagesForViewer,
      pinnedRoomIds,
      pinnedThreadSnapshots,
      isRoomPinned,
      togglePinRoom,
      unpinRoom,
      popOutRoomToBubble,
      openBubbleChatWithUser,
      pendingBubbleThread,
      clearPendingBubble,
      pinnedListRoomIds,
      isListPinned,
      toggleListPin,
      unpinListRoom,
      mutedRoomIds,
      isRoomMuted,
      toggleMuteRoom,
      hiddenRoomIds,
      hideRoom,
      unhideRoom,
      shareDropMode,
      completeShareDrop,
    ],
  );

  return (
    <CinsChatContext.Provider value={value}>
      {children}
      {viewerProfileId ? <CinsChatDock /> : null}
      {viewerProfileId ? <ChatIncomingCallHost /> : null}
      {open ? (
        <CinsChatOverlay
          launch={launch}
          onClose={closeChat}
          onUnreadChange={setTotalUnread}
          shellFill={shellFill}
        />
      ) : null}
    </CinsChatContext.Provider>
  );
}
