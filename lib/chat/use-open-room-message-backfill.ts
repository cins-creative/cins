"use client";

import { useEffect, useRef } from "react";

import { fetchRoomMessagesPage } from "@/lib/chat/messages-client";
import { isPendingRoomId } from "@/lib/chat/optimistic-thread";
import {
  CHAT_ENVELOPE_CATCHUP_EVENT,
  CHAT_REALTIME_RESUBSCRIBED_EVENT,
} from "@/lib/chat/realtime-events";
import type { ChatMessage } from "@/lib/chat/types";

/**
 * Lưới an toàn cho hội thoại đang mở. Realtime WS có thể «joined» nhưng im
 * (tab lâu, máy ngủ, gap reconnect) nên vẫn cần REST bù.
 *
 * Trước đây: poll **3s** kéo lại 12 tin cuối — chặn dưới độ trễ ở 3s, và gọi
 * endpoint nặng (ghim + read cursors + enrich + dynamic import) ~1200 lần/giờ
 * dù 99% lần không có tin mới.
 *
 * Nay: **catch-up theo cursor** (`?after=<id tin mới nhất đang có>`), chạy khi
 * realtime vừa nối lại / tab hiện lại / có mạng lại, cộng nhịp an toàn 20s.
 * Server short-circuit khi không có tin mới nên tick rỗng rất rẻ.
 */
export const OPEN_ROOM_MESSAGE_BACKFILL_MS = 20_000;

/** Số tin mỗi vòng delta. */
const CATCHUP_PAGE_SIZE = 50;
/** Trần số vòng để lấp gap dài (50×4 = 200 tin) — tránh lỗ tin ở giữa. */
const MAX_CATCHUP_PAGES = 4;
/** Không có cursor (state rỗng) → kéo tail như đường mở phòng. */
const TAIL_PAGE_SIZE = 30;

/**
 * Một phòng chỉ nên có **một** poller. `useOpenRoomMessageBackfill` được dùng ở
 * cả overlay và bubble mini; mở cả hai trước đây thành 2 request mỗi nhịp.
 * Overlay ưu tiên cao hơn; owner rời thì instance còn lại tự nhận.
 */
type Claim = { token: object; priority: number };
const roomOwners = new Map<string, Claim>();

function claimRoom(roomId: string, token: object, priority: number): boolean {
  const current = roomOwners.get(roomId);
  if (!current || current.token === token || priority >= current.priority) {
    roomOwners.set(roomId, { token, priority });
    return true;
  }
  return false;
}

function releaseRoom(roomId: string, token: object): void {
  if (roomOwners.get(roomId)?.token === token) {
    roomOwners.delete(roomId);
  }
}

export type OpenRoomMessageBackfillOptions = {
  enabled?: boolean;
  intervalMs?: number;
  /**
   * Id tin **mới nhất** đang có trong state của phòng — cursor delta.
   * Trả `null`/`undefined` ⇒ kéo tail (hành vi cũ).
   */
  getLatestMessageId?: () => string | null | undefined;
  /** Overlay nên cao hơn mini để giành quyền poll khi mở cả hai. */
  priority?: number;
};

export function useOpenRoomMessageBackfill(
  roomId: string | null | undefined,
  onMessages: (messages: ChatMessage[]) => void,
  options?: OpenRoomMessageBackfillOptions,
) {
  const onMessagesRef = useRef(onMessages);
  onMessagesRef.current = onMessages;
  const getLatestRef = useRef(options?.getLatestMessageId);
  getLatestRef.current = options?.getLatestMessageId;

  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? OPEN_ROOM_MESSAGE_BACKFILL_MS;
  const priority = options?.priority ?? 0;

  useEffect(() => {
    const id = roomId?.trim();
    if (!id || !enabled || isPendingRoomId(id)) return;

    const token = {};
    claimRoom(id, token, priority);

    let cancelled = false;
    let inflight = false;

    const tick = async () => {
      if (cancelled || inflight) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      /* Không phải owner: chỉ chạy nếu owner đã rời (claim trống). */
      if (roomOwners.get(id)?.token !== token && !claimRoom(id, token, priority)) {
        return;
      }

      inflight = true;
      try {
        let cursor = getLatestRef.current?.() ?? null;

        if (!cursor) {
          const tail = await fetchRoomMessagesPage(id, {
            limit: TAIL_PAGE_SIZE,
          });
          if (!tail || cancelled || tail.messages.length === 0) return;
          onMessagesRef.current(tail.messages);
          return;
        }

        /* Lấp gap theo nhiều vòng — dừng khi hết tin mới hoặc chạm trần. */
        for (let page = 0; page < MAX_CATCHUP_PAGES; page += 1) {
          const delta = await fetchRoomMessagesPage(id, {
            after: cursor,
            limit: CATCHUP_PAGE_SIZE,
          });
          if (!delta || cancelled || delta.messages.length === 0) return;

          onMessagesRef.current(delta.messages);

          if (!delta.hasMore) return;
          const last = delta.messages.at(-1);
          if (!last?.id || last.id === cursor) return;
          cursor = last.id;
        }
      } catch {
        /* ignore */
      } finally {
        inflight = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const onOnline = () => void tick();
    /* Realtime vừa (re)subscribe → có thể vừa có gap; bù ngay, không chờ nhịp. */
    const onResubscribed = () => void tick();
    let envelopeTimer: ReturnType<typeof setTimeout> | null = null;
    const onEnvelope = (ev: Event) => {
      const room = (ev as CustomEvent<{ roomId?: string }>).detail?.roomId;
      if (room !== id) return;
      if (envelopeTimer) clearTimeout(envelopeTimer);
      envelopeTimer = setTimeout(() => void tick(), 120);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener(CHAT_REALTIME_RESUBSCRIBED_EVENT, onResubscribed);
    window.addEventListener(CHAT_ENVELOPE_CATCHUP_EVENT, onEnvelope);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (envelopeTimer) clearTimeout(envelopeTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(
        CHAT_REALTIME_RESUBSCRIBED_EVENT,
        onResubscribed,
      );
      window.removeEventListener(CHAT_ENVELOPE_CATCHUP_EVENT, onEnvelope);
      releaseRoom(id, token);
    };
  }, [enabled, intervalMs, priority, roomId]);
}
