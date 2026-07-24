"use client";

import { useEffect, useRef } from "react";

import type { ChatRealtimeRow } from "@/lib/chat/realtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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

    /* Topic duy nhất mỗi lần subscribe — tránh tái dùng channel đã
       `subscribe()` (StrictMode double-invoke / remount nhanh) gây lỗi
       «cannot add postgres_changes callbacks after subscribe()». */
    const uniqueTopic = `cins-chat:${viewerProfileId}:${Math.random()
      .toString(36)
      .slice(2)}`;
    const channel = supabase
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewerProfileId]);
}
