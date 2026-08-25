"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 1_000;
/** Watchdog: kênh có thể "chết im" không bắn CLOSED/ERROR (máy ngủ, tab throttle). */
const HEARTBEAT_MS = 25_000;

/**
 * Theo dõi presence realtime của 1 phòng chat.
 *
 * Mọi user đang mở phòng (roomId) đều `track` chính họ trên cùng một topic
 * `room-presence:{roomId}`, nên ai cũng thấy được danh sách userId đang online
 * trong phòng đó. Trả về Set các `id_nguoi_dung` đang hiện diện.
 */
export function useRoomPresence(
  roomId: string | null,
  viewerProfileId: string | null,
): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId || !viewerProfileId) {
      setOnlineIds(new Set());
      return;
    }

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

    const syncOnline = () => {
      if (disposed || !channel) return;
      const state = channel.presenceState();
      // key của presenceState chính là `viewerProfileId` mỗi client track.
      setOnlineIds(new Set(Object.keys(state)));
    };

    /* Topic cố định theo phòng để mọi client thấy nhau. Mỗi lần reconnect tạo
       channel mới cùng topic — await removeChannel trước để tránh chồng. */
    const connect = () => {
      if (disposed) return;

      channel = supabase.channel(`room-presence:${roomId}`, {
        config: { presence: { key: viewerProfileId } },
      });

      channel
        .on("presence", { event: "sync" }, syncOnline)
        .on("presence", { event: "join" }, syncOnline)
        .on("presence", { event: "leave" }, syncOnline)
        .subscribe((status) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            retryCount = 0;
            void channel?.track({ userId: viewerProfileId, at: Date.now() });
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

  return onlineIds;
}
