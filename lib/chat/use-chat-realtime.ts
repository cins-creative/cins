"use client";

import { useEffect, useRef } from "react";

import type { ChatRealtimeRow } from "@/lib/chat/realtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 1_000;
/** Watchdog: kênh có thể "chết im" không bắn CLOSED/ERROR (máy ngủ, tab throttle). */
const HEARTBEAT_MS = 25_000;

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

    /* Tab lại hiện: chỉ reconnect khi kênh không còn joined — teardown kênh
       khỏe tạo gap INSERT (tin mới rơi trong lúc await removeChannel). */
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const state = channel?.state;
      if (state === "joined" || state === "joining") return;
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

    void (async () => {
      try {
        await supabase.realtime.setAuth();
      } catch {
        /* token callback lỗi — vẫn thử subscribe */
      }
      if (disposed) return;
      connect();
    })();
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
  }, [viewerProfileId]);
}
