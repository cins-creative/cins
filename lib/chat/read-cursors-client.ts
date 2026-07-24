import type {
  ChatMessage,
  ChatOrgKind,
  ChatReadCursor,
  ChatThread,
} from "@/lib/chat/types";

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

/**
 * Messenger-style: avatar «đã xem» chỉ neo dưới tin của mình.
 * Nếu watermark của người khác đang trỏ tin của họ (hoặc tin hệ thống),
 * kéo về tin `me` gần nhất phía trước — tránh hiện `is-them` gây hiểu nhầm
 * là đã đọc khi người xem chưa kịp mở nội dung.
 */
export function snapReadCursorsToOwnMessages(
  cursors: ChatReadCursor[],
  messages: Array<Pick<ChatMessage, "id" | "from" | "deleted">>,
): ChatReadCursor[] {
  if (cursors.length === 0 || messages.length === 0) return [];

  const indexById = new Map<string, number>();
  for (let i = 0; i < messages.length; i++) {
    indexById.set(messages[i]!.id, i);
  }

  const snapped: ChatReadCursor[] = [];
  for (const cursor of cursors) {
    const at = indexById.get(cursor.messageId);
    if (at == null) continue;

    let targetId: string | null = null;
    for (let i = at; i >= 0; i--) {
      const msg = messages[i]!;
      if (msg.from === "me" && !msg.deleted) {
        targetId = msg.id;
        break;
      }
    }
    if (!targetId) continue;
    snapped.push(
      targetId === cursor.messageId
        ? cursor
        : { ...cursor, messageId: targetId },
    );
  }
  return snapped;
}

/** Key ổn định cho cursor phía org trong phòng 1_org. */
export function orgReadCursorUserId(orgId: string): string {
  return `org:${orgId}`;
}

/**
 * Realtime đã-đọc trong phòng org: ưu tiên watermark org (không lộ admin).
 * Trả null nếu không phải phòng org / thiếu orgId — caller xử lý DM/nhóm.
 *
 * Phòng org trên overlay chủ yếu là phía user (`thanh_vien`); reader khác = staff → org.
 * Nếu đã có cursor cá nhân cho reader (ví dụ hydrate sẵn) thì chỉ patch cá nhân.
 */
export function applyOrgRoomReadCursorRealtime(
  cursors: ChatReadCursor[],
  thread: Pick<
    ChatThread,
    "kind" | "orgId" | "name" | "avatarUrl" | "avatarInitial" | "avatarHue" | "orgKind"
  >,
  readerUserId: string,
  messageId: string,
): ChatReadCursor[] | null {
  if (thread.kind !== "org" || !thread.orgId) return null;

  const patchedPersonal = patchChatReadCursorMessage(
    cursors,
    readerUserId,
    messageId,
  );
  if (patchedPersonal) return patchedPersonal;

  const orgKey = orgReadCursorUserId(thread.orgId);

  const patchedOrg = patchChatReadCursorMessage(cursors, orgKey, messageId);
  if (patchedOrg) return patchedOrg;

  const nextCursor: ChatReadCursor = {
    userId: orgKey,
    messageId,
    name: thread.name,
    avatarUrl: thread.avatarUrl ?? null,
    initial: thread.avatarInitial,
    hue: thread.avatarHue,
    asOrg: true,
    orgKind: thread.orgKind as ChatOrgKind | undefined,
  };

  const without = cursors.filter(
    (c) => c.userId !== orgKey && c.userId !== readerUserId,
  );
  return [...without, nextCursor];
}
