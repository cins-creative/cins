"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { CinsChatOverlay } from "@/components/cins/CinsChatOverlay";
import { buildOptimisticDirectThread } from "@/lib/chat/optimistic-thread";
import type {
  ChatLaunchState,
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

type CinsChatContextValue = {
  open: boolean;
  totalUnread: number;
  openChat: (options?: OpenChatOptions) => Promise<void>;
  closeChat: () => void;
  refreshUnread: () => Promise<void>;
  setTotalUnread: (count: number) => void;
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

  const refreshUnread = useCallback(async () => {
    if (!viewerProfileId) {
      setTotalUnread(0);
      return;
    }
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { totalUnread?: number };
      setTotalUnread(json.totalUnread ?? 0);
    } catch {
      /* ignore */
    }
  }, [viewerProfileId]);

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
    },
  []);

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
      totalUnread,
      openChat,
      closeChat,
      refreshUnread,
      setTotalUnread,
    }),
    [open, totalUnread, openChat, closeChat, refreshUnread],
  );

  return (
    <CinsChatContext.Provider value={value}>
      {children}
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
