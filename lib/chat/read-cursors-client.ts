import type { ChatReadCursor } from "@/lib/chat/types";

export const CHAT_SEEN_AVATARS_MAX = 5;

/** Gộp / cập nhật cursor một user (realtime hoặc refresh). */
export function upsertChatReadCursor(
  cursors: ChatReadCursor[],
  next: ChatReadCursor,
): ChatReadCursor[] {
  const without = cursors.filter((c) => c.userId !== next.userId);
  if (!next.messageId) return without;
  return [...without, next];
}

/** Đổi messageId nếu đã biết profile user; null nếu chưa có trong list. */
export function patchChatReadCursorMessage(
  cursors: ChatReadCursor[],
  userId: string,
  messageId: string,
): ChatReadCursor[] | null {
  const idx = cursors.findIndex((c) => c.userId === userId);
  if (idx < 0) return null;
  const prev = cursors[idx]!;
  if (prev.messageId === messageId) return cursors;
  const next = [...cursors];
  next[idx] = { ...prev, messageId };
  return next;
}

export function groupReadCursorsByMessage(
  cursors: ChatReadCursor[],
): Map<string, ChatReadCursor[]> {
  const map = new Map<string, ChatReadCursor[]>();
  for (const cursor of cursors) {
    const list = map.get(cursor.messageId) ?? [];
    list.push(cursor);
    map.set(cursor.messageId, list);
  }
  return map;
}
