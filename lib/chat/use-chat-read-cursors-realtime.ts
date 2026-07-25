"use client";

import { useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type ChatDaDocRealtimeRow = {
  id_phong: string;
  id_nguoi_dung: string;
  id_tin_nhan_cuoi_doc: string | null;
  cap_nhat_luc?: string;
};

const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 1_000;

/**
 * Subscribe cursor đã đọc trong 1 phòng (watermark Messenger).
 * Cần RLS member SELECT + publication `chat_da_doc`.
 */
export function useChatReadCursorsRealtime(
  roomId: string | null | undefined,
  viewerProfileId: string | null | undefined,
  onChange: (row: ChatDaDocRealtimeRow) => void,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const id = roomId?.trim();
    if (!id || !viewerProfileId) return;

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

      /* Topic duy nhất mỗi lần subscribe — mini + overlay (hoặc StrictMode
         double-invoke) cùng phòng không đụng channel đã `subscribe()`, tránh lỗi
         «cannot add postgres_changes callbacks after subscribe()». */
      const uniqueTopic = `cins-chat-read:${id}:${Math.random()
        .toString(36)
        .slice(2)}`;

      channel = supabase
        .channel(uniqueTopic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_da_doc",
            filter: `id_phong=eq.${id}`,
          },
          (payload) => {
            const row = payload.new as ChatDaDocRealtimeRow | null;
            if (!row?.id_phong || !row.id_nguoi_dung) return;
            if (row.id_nguoi_dung === viewerProfileId) return;
            onChangeRef.current(row);
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
  }, [roomId, viewerProfileId]);
}
