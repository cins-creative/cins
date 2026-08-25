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
/** Watchdog: kênh có thể "chết im" không bắn CLOSED/ERROR (máy ngủ, tab throttle). */
const HEARTBEAT_MS = 25_000;

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
    let reconnecting = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdogTimer: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const clearRetryTimer = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const teardown = async () => {
      const current = channel;
      channel = null;
      if (current) {
        try {
          await supabase.removeChannel(current);
        } catch {
          /* ignore */
        }
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
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            scheduleReconnect();
          }
        });
    };

    const hardReconnect = async () => {
      if (disposed || reconnecting) return;
      reconnecting = true;
      clearRetryTimer();
      try {
        await teardown();
        if (disposed) return;
        try {
          await supabase.realtime.setAuth();
        } catch {
          /* token callback lỗi — vẫn thử subscribe lại */
        }
        if (disposed) return;
        connect();
      } finally {
        reconnecting = false;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnecting) return;
      clearRetryTimer();
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** retryCount,
        MAX_RETRY_DELAY_MS,
      );
      retryCount += 1;
      retryTimer = setTimeout(() => {
        if (disposed) return;
        void hardReconnect();
      }, delay);
    };

    /* Trở lại tab / có mạng lại — làm mới kênh khi socket cũ có thể đã
       treo im lặng (không bắn CHANNEL_ERROR nhưng cũng không còn nhận frame). */
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearRetryTimer();
      retryCount = 0;
      void hardReconnect();
    };
    const onOnline = () => {
      clearRetryTimer();
      retryCount = 0;
      void hardReconnect();
    };

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") {
        clearRetryTimer();
        retryCount = 0;
        void hardReconnect();
      }
    });

    connect();
    watchdogTimer = setInterval(() => {
      if (disposed || reconnecting) return;
      if (document.visibilityState !== "visible") return;
      const state = channel?.state;
      if (state === "joined" || state === "joining") return;
      clearRetryTimer();
      retryCount = 0;
      void hardReconnect();
    }, HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      clearRetryTimer();
      if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
      }
      authSub.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      void teardown();
    };
  }, [roomId, viewerProfileId]);
}
