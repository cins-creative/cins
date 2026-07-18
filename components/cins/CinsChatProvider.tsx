"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { CinsChatDock } from "@/components/cins/CinsChatDock";
import { CinsChatOverlay } from "@/components/cins/CinsChatOverlay";
import { scheduleWhenIdle } from "@/lib/client/schedule-when-idle";
import {
  readChatThreadsCache,
  readRoomMessagesCache,
  type ChatThreadsSnapshot,
} from "@/lib/chat/chat-session-cache";
import {
  prefetchChatThreads,
  prefetchRoomMessages,
} from "@/lib/chat/chat-prefetch";
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
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import type {
  ChatContextCard,
  ChatLaunchState,
  ChatMessage,
  ChatOrgKind,
  ChatPeerPreview,
  ChatThread,
  ChatThreadGroup,
} from "@/lib/chat/types";

type OpenChatOrgPreview = {
  name?: string;
  avatarUrl?: string | null;
  orgKind?: ChatOrgKind;
};

type OpenChatOptions = {
  targetUserId?: string;
  peerPreview?: Omit<ChatPeerPreview, "userId">;
  roomId?: string;
  tab?: ChatThreadGroup;
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
  viewerProfileId: string | null;
  totalUnread: number;
  openChat: (options?: OpenChatOptions) => Promise<void>;
  closeChat: () => void;
  refreshUnread: () => Promise<void>;
  setTotalUnread: (count: number) => void;
  subscribeChatMessages: (listener: ChatMessageListener) => () => void;
  setChatFocus: (roomId: string | null, surface: ChatFocusSurface) => void;
  getCachedThreads: () => ChatThreadsSnapshot | null;
  getCachedRoomMessages: (roomId: string) => ChatMessage[] | null;
  prefetchChatData: () => Promise<ChatThreadsSnapshot | null>;
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
};

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
  const listenersRef = useRef(new Set<ChatMessageListener>());
  const focusRef = useRef<{ roomId: string | null; surface: ChatFocusSurface }>({
    roomId: null,
    surface: null,
  });

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
      setTotalUnread(json.totalUnread ?? 0);
    } catch {
      /* ignore */
    }
  }, [viewerProfileId]);

  const getCachedThreads = useCallback((): ChatThreadsSnapshot | null => {
    return readChatThreadsCache(viewerProfileId);
  }, [viewerProfileId]);

  const getCachedRoomMessages = useCallback(
    (roomId: string): ChatMessage[] | null => {
      return readRoomMessagesCache(viewerProfileId, roomId);
    },
    [viewerProfileId],
  );

  const prefetchChatData = useCallback(async (): Promise<ChatThreadsSnapshot | null> => {
    if (!viewerProfileId) return null;
    const snapshot = await prefetchChatThreads(viewerProfileId);
    if (snapshot) {
      setTotalUnread(snapshot.totalUnread);
    }
    return snapshot;
  }, [viewerProfileId]);

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

  const popOutRoomToBubble = useCallback(
    (thread: ChatThread, relatedThreads?: ChatThread[]) => {
      if (!viewerProfileId || !thread.roomId) return;
      const roomId = thread.roomId;
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
      void refreshUnread();
    },
    [refreshUnread, viewerProfileId],
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
      setTotalUnread(cached.totalUnread);
    }

    const cancelIdle = scheduleWhenIdle(() => {
      void prefetchChatData();
    });

    const id = window.setInterval(() => {
      void prefetchChatData();
    }, 120_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void prefetchChatData();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelIdle();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [prefetchChatData, viewerProfileId]);

  const subscribeChatMessages = useCallback((listener: ChatMessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const setChatFocus = useCallback(
    (roomId: string | null, surface: ChatFocusSurface) => {
      focusRef.current = { roomId, surface };
    },
    [],
  );

  const handleRealtimeInsert = useCallback(
    (row: Parameters<typeof toRealtimeMessageEvent>[0]) => {
      if (!viewerProfileId) return;

      const event = toRealtimeMessageEvent(row, viewerProfileId, "insert");
      for (const listener of listenersRef.current) {
        listener(event);
      }

      const fromPeer = event.senderId !== viewerProfileId;
      if (!fromPeer) return;

      const focus = focusRef.current;
      const isViewing =
        focus.surface !== null && focus.roomId === event.roomId;

      if (!isViewing) {
        setTotalUnread((count) => count + 1);
      }
    },
    [viewerProfileId],
  );

  const handleRealtimeUpdate = useCallback(
    (row: Parameters<typeof toRealtimeMessageEvent>[0]) => {
      if (!viewerProfileId) return;

      const event = toRealtimeMessageEvent(row, viewerProfileId, "update");
      for (const listener of listenersRef.current) {
        listener(event);
      }

      /* Shop bump đơn → người mua nhận như tin mới (không INSERT trùng). */
      const fromPeer = event.senderId !== viewerProfileId;
      if (
        !fromPeer ||
        event.message.nguCanh?.loai !== "don_hang"
      ) {
        return;
      }
      const focus = focusRef.current;
      const isViewing =
        focus.surface !== null && focus.roomId === event.roomId;
      if (!isViewing) {
        setTotalUnread((count) => count + 1);
      }
    },
    [viewerProfileId],
  );

  useChatRealtime(viewerProfileId, handleRealtimeInsert, handleRealtimeUpdate);

  const closeChat = useCallback(() => {
    setOpen(false);
    setLaunch(null);
    void refreshUnread();
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
          name: options.orgPreview?.name ?? "Tổ chức",
          group: "to_chuc",
          kind: "org",
          orgKind: options.orgPreview?.orgKind,
          verified: true,
          role: "Tổ chức",
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
        setOpen(true);

        try {
          await resolveOrgRoom(options.orgId, options.nguCanh);
        } catch (error) {
          setOpen(false);
          setLaunch(null);
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
        setOpen(true);

        try {
          await resolveDirectRoom(options.targetUserId, {
            nguCanh,
            autoSendNguCanh,
            autoSendImageId,
            autoSendImageUrl,
          });
        } catch (error) {
          setOpen(false);
          setLaunch(null);
          throw error;
        }
        return;
      }

      setLaunch(
        options?.roomId
          ? {
              thread: {
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
              tab: options.tab,
            }
          : null,
      );
      setOpen(true);
    },
    [resolveDirectRoom, resolveOrgRoom, router, viewerProfileId],
  );

  const value = useMemo(
    () => ({
      open,
      viewerProfileId,
      totalUnread,
      openChat,
      closeChat,
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
    }),
    [
      open,
      viewerProfileId,
      totalUnread,
      openChat,
      closeChat,
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
    ],
  );

  return (
    <CinsChatContext.Provider value={value}>
      {children}
      {viewerProfileId ? <CinsChatDock /> : null}
      {open ? (
        <CinsChatOverlay
          launch={launch}
          onClose={closeChat}
          onUnreadChange={setTotalUnread}
        />
      ) : null}
    </CinsChatContext.Provider>
  );
}
