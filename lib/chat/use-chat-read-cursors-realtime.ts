"use client";

import { useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type ChatDaDocRealtimeRow = {
  id_phong: string;
  id_nguoi_dung: string;
  id_tin_nhan_cuoi_doc: string | null;
  cap_nhat_luc?: string;
};

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

    const channel = supabase
      .channel(`cins-chat-read:${id}`)
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, viewerProfileId]);
}
