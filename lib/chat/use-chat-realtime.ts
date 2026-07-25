"use client";

import { useEffect, useRef } from "react";

import type { ChatRealtimeRow } from "@/lib/chat/realtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 1_000;

export function useChatRealtime(
  viewerProfileId: string | null,
  onInsert: (row: ChatRealtimeRow) => void,
  onUpdate?: (row: ChatRealtimeRow) => void,
) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!viewerProfileId) return;

    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    let disposed = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const clearRetryTimer = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    /* Kênh «zombie»: trình duyệt báo còn mở nhưng ngưng nhận frame (máy ngủ,
       tab bị suspend trên mobile, mất mạng chớp nhoáng) — không tự phục hồi
       nếu chỉ dựa vào .subscribe() một lần. Theo dõi status + tự resubscribe. */
    const connect = () => {
      if (disposed) return;

      /* Topic duy nhất mỗi lần subscribe — tránh tái dùng channel đã
         `subscribe()` (StrictMode double-invoke / remount nhanh) gây lỗi
         «cannot add postgres_changes callbacks after subscribe()». */
      const uniqueTopic = `cins-chat:${viewerProfileId}:${Math.random()
        .toString(36)
        .slice(2)}`;

      channel = supabase
        .channel(uniqueTopic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_tin_nhan",
          },
          (payload) => {
            const row = payload.new as ChatRealtimeRow | null;
            if (!row?.id || row.da_xoa) return;
            onInsertRef.current(row);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_tin_nhan",
          },
          (payload) => {
            const row = payload.new as ChatRealtimeRow | null;
            if (!row?.id) return;
            onUpdateRef.current?.(row);
          },
        )
        .subscribe((status) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            retryCount = 0;
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            scheduleReconnect();
          }
        });
    };

    const teardown = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      clearRetryTimer();
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** retryCount,
        MAX_RETRY_DELAY_MS,
      );
      retryCount += 1;
      retryTimer = setTimeout(() => {
        if (disposed) return;
        teardown();
        connect();
      }, delay);
    };

    /* Trở lại tab / có mạng lại — làm mới kênh phòng khi socket cũ có thể đã
       treo im lặng (không bắn CHANNEL_ERROR nhưng cũng không còn nhận frame). */
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearRetryTimer();
        retryCount = 0;
        teardown();
        connect();
      }
    };
    const onOnline = () => {
      clearRetryTimer();
      retryCount = 0;
      teardown();
      connect();
    };

    connect();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      clearRetryTimer();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      teardown();
    };
  }, [viewerProfileId]);
}
