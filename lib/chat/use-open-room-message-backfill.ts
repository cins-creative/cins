"use client";

import { useEffect, useRef } from "react";

import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import { isPendingRoomId } from "@/lib/chat/optimistic-thread";
import type { ChatMessage } from "@/lib/chat/types";

/** Poll REST khi đang mở hội thoại — bù tin miss khi WS zombie / gap reconnect. */
export const OPEN_ROOM_MESSAGE_BACKFILL_MS = 3_000;

export function useOpenRoomMessageBackfill(
  roomId: string | null | undefined,
  onMessages: (messages: ChatMessage[]) => void,
  options?: { enabled?: boolean; intervalMs?: number },
) {
  const onMessagesRef = useRef(onMessages);
  onMessagesRef.current = onMessages;
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? OPEN_ROOM_MESSAGE_BACKFILL_MS;

  useEffect(() => {
    const id = roomId?.trim();
    if (!id || !enabled || isPendingRoomId(id)) return;

    let cancelled = false;
    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const page = await fetchRoomMessagesPage(id, { limit: 12 });
        if (!page || cancelled || page.messages.length === 0) return;
        onMessagesRef.current(page.messages);
      } catch {
        /* ignore */
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, roomId]);
}
