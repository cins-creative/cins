"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
    // Topic phải cố định theo phòng để mọi client thấy nhau.
    const channel = supabase.channel(`room-presence:${roomId}`, {
      config: { presence: { key: viewerProfileId } },
    });

    const syncOnline = () => {
      if (disposed) return;
      const state = channel.presenceState();
      // key của presenceState chính là `viewerProfileId` mỗi client track.
      setOnlineIds(new Set(Object.keys(state)));
    };

    channel
      .on("presence", { event: "sync" }, syncOnline)
      .on("presence", { event: "join" }, syncOnline)
      .on("presence", { event: "leave" }, syncOnline)
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          void channel.track({ userId: viewerProfileId, at: Date.now() });
        }
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, viewerProfileId]);

  return onlineIds;
}
