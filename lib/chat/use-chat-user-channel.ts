"use client";

import { useEffect, useRef } from "react";

import {
  CHAT_BROADCAST_EVENT,
  chatUserTopic,
  type ChatEnvelope,
} from "@/lib/chat/publish-types";
import { emitChatEnvelope } from "@/lib/chat/realtime-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 1_000;
const HEARTBEAT_MS = 25_000;

export function isChatBroadcastClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CHAT_BROADCAST?.trim() === "on";
}

function parseEnvelope(raw: unknown): ChatEnvelope | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const roomId = typeof o.roomId === "string" ? o.roomId : "";
  const messageId = typeof o.messageId === "string" ? o.messageId : "";
  const senderId = typeof o.senderId === "string" ? o.senderId : "";
  if (!roomId || !messageId || !senderId) return null;
  return {
    roomId,
    messageId,
    senderId,
    sentAt: typeof o.sentAt === "string" ? o.sentAt : "",
    kind: typeof o.kind === "string" ? o.kind : "text",
    preview: typeof o.preview === "string" ? o.preview : "",
    event: o.event === "update" ? "update" : "insert",
  };
}

/**
 * Kênh riêng `cins-user:<profileId>` — chỉ bật khi `NEXT_PUBLIC_CHAT_BROADCAST=on`
 * **và** đã apply `migration_chat_user_broadcast.sql`. Không thay CDC.
 */
export function useChatUserChannel(
  viewerProfileId: string | null,
  onEnvelope: (envelope: ChatEnvelope) => void,
) {
  const onEnvelopeRef = useRef(onEnvelope);
  onEnvelopeRef.current = onEnvelope;

  useEffect(() => {
    if (!viewerProfileId || !isChatBroadcastClientEnabled()) return;

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

    const connect = () => {
      if (disposed) return;
      const topic = chatUserTopic(viewerProfileId);
      channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: CHAT_BROADCAST_EVENT }, (payload) => {
          const envelope = parseEnvelope(
            (payload as { payload?: unknown }).payload ?? payload,
          );
          if (!envelope) return;
          onEnvelopeRef.current(envelope);
          emitChatEnvelope(envelope.roomId);
        })
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
          /* ignore */
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
        /* ignore */
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
