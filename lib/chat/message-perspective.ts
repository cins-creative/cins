import type { ChatContextCard, ChatMessage } from "@/lib/chat/types";

/** Parse `chat_tin_nhan.ngu_canh` — dùng chung server + realtime client. */
export function parseChatNguCanh(raw: unknown): ChatContextCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const tieuDe = typeof r.tieuDe === "string" ? r.tieuDe : null;
  const loai = typeof r.loai === "string" ? r.loai : null;
  if (!id || !tieuDe || !loai) return null;
  return {
    loai,
    id,
    tieuDe,
    moTa: typeof r.moTa === "string" ? r.moTa : null,
    anh: typeof r.anh === "string" ? r.anh : null,
    href: typeof r.href === "string" ? r.href : null,
    orgTen: typeof r.orgTen === "string" ? r.orgTen : null,
  };
}

/** Chuẩn hoá `from` theo viewer — tránh bubble lệch khi cache/realtime lệch id. */
export function applyChatViewerPerspective(
  messages: ChatMessage[],
  viewerProfileId: string | null | undefined,
): ChatMessage[] {
  if (!viewerProfileId) return messages;
  let changed = false;
  const next = messages.map((msg) => {
    const senderId = msg.senderUserId;
    if (!senderId) return msg;
    const from: ChatMessage["from"] =
      senderId === viewerProfileId ? "me" : "them";
    if (from === msg.from) return msg;
    changed = true;
    return { ...msg, from };
  });
  return changed ? next : messages;
}
