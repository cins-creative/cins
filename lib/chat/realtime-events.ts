/**
 * Tín hiệu nội bộ giữa các hook chat client — tránh phụ thuộc vòng giữa
 * `use-chat-realtime` (nguồn) và các hook bù tin (người nghe).
 */

/**
 * Kênh realtime chat vừa `SUBSCRIBED` (lần đầu hoặc sau reconnect).
 * Người nghe nên coi đây là "có thể vừa có gap" → catch-up ngay.
 */
export const CHAT_REALTIME_RESUBSCRIBED_EVENT = "cins:chat-realtime-resubscribed";

/** Envelope tới phòng đang mở → catch-up `?after=` (debounce trong hook). */
export const CHAT_ENVELOPE_CATCHUP_EVENT = "cins:chat-envelope-catchup";

export function emitChatRealtimeResubscribed(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHAT_REALTIME_RESUBSCRIBED_EVENT));
}

export function emitChatEnvelope(roomId: string): void {
  if (typeof window === "undefined" || !roomId) return;
  window.dispatchEvent(
    new CustomEvent(CHAT_ENVELOPE_CATCHUP_EVENT, { detail: { roomId } }),
  );
}
