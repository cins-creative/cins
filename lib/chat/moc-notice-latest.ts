import type { ChatMessage, ChatMocNoticeSuKien } from "@/lib/chat/types";

const MOC_STAGE_RANK: Record<ChatMocNoticeSuKien, number> = {
  tao: 0,
  nhac_truoc: 1,
  den_han: 2,
};

/**
 * Cùng một `chat_moc` chỉ giữ thông báo giai đoạn mới nhất
 * (Mốc mới → Nhắc nhở → Đến hạn). Tin cũ ẩn khỏi dòng chat.
 */
export function hideSupersededMocNotices(
  messages: ChatMessage[],
): ChatMessage[] {
  const keepIdByMoc = new Map<string, string>();
  const sortKeyByMoc = new Map<string, string>();

  for (const msg of messages) {
    if (msg.deleted) continue;
    const notice = msg.mocNhac;
    if (!notice) continue;
    const rank = MOC_STAGE_RANK[notice.suKien] ?? 0;
    const key = `${msg.sentAt}\t${rank}`;
    const prev = sortKeyByMoc.get(notice.mocId);
    if (!prev || key >= prev) {
      sortKeyByMoc.set(notice.mocId, key);
      keepIdByMoc.set(notice.mocId, msg.id);
    }
  }

  if (keepIdByMoc.size === 0) return messages;

  const hide = new Set<string>();
  for (const msg of messages) {
    if (msg.deleted) continue;
    const notice = msg.mocNhac;
    if (!notice) continue;
    const keepId = keepIdByMoc.get(notice.mocId);
    if (keepId && keepId !== msg.id) hide.add(msg.id);
  }

  if (hide.size === 0) return messages;
  return messages.filter((msg) => !hide.has(msg.id));
}
