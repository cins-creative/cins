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
  toRealtimeMessageEvent,
  type ChatRealtimeMessageEvent,
} from "@/lib/chat/realtime";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import type {
  ChatLaunchState,
  ChatMessage,
  ChatPeerPreview,
  ChatThread,
  ChatThreadGroup,
} from "@/lib/chat/types";

type OpenChatOptions = {
  targetUserId?: string;
  peerPreview?: Omit<ChatPeerPreview, "userId">;
  roomId?: string;
  tab?: ChatThreadGroup;
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
};

const CinsChatContext = createContext<CinsChatContextValue | null>(null);

export function useCinsChat() {
  const ctx = useContext(CinsChatContext);
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
    },
    [viewerProfileId],
  );

  useChatRealtime(viewerProfileId, handleRealtimeInsert, handleRealtimeUpdate);

  const closeChat = useCallback(() => {
    setOpen(false);
    setLaunch(null);
    void refreshUnread();
  }, [refreshUnread]);

  const resolveDirectRoom = useCallback(async (targetUserId: string) => {
    const res = await fetch("/api/chat/rooms/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_nguoi: targetUserId }),
    });
    const json = (await res.json()) as { thread?: ChatThread; error?: string };
    if (!res.ok || !json.thread) {
      throw new Error(json.error ?? "Không mở được hội thoại.");
    }

    setLaunch({
      thread: json.thread,
      tab: json.thread.group,
      resolving: false,
    });
    return json.thread;
  }, []);

  const openChat = useCallback(
    async (options?: OpenChatOptions) => {
      if (!viewerProfileId) {
        router.push("/login");
        return;
      }

      if (options?.targetUserId) {
        const peer: ChatPeerPreview = {
          userId: options.targetUserId,
          name: options.peerPreview?.name ?? "Người dùng",
          role: options.peerPreview?.role,
          avatarInitial: options.peerPreview?.avatarInitial,
          avatarHue: options.peerPreview?.avatarHue,
          avatarUrl: options.peerPreview?.avatarUrl,
        };
        const optimistic = buildOptimisticDirectThread(peer, options.tab ?? "nguoi_la");

        setLaunch({
          thread: optimistic,
          tab: optimistic.group,
          resolving: true,
        });
        setOpen(true);

        try {
          await resolveDirectRoom(options.targetUserId);
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
    [resolveDirectRoom, router, viewerProfileId],
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
