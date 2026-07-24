import { parseChatMentions } from "@/lib/chat/mentions";
import type {
  ChatContextCard,
  ChatCanvasBinhLuanNotice,
  ChatMentionRef,
  ChatMessage,
  ChatMocNotice,
  ChatMocNoticeSuKien,
} from "@/lib/chat/types";

export { parseChatMentions } from "@/lib/chat/mentions";

/** Parse `chat_tin_nhan.ngu_canh` — dùng chung server + realtime client. */
export function parseChatNguCanh(raw: unknown): ChatContextCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const tieuDe = typeof r.tieuDe === "string" ? r.tieuDe : null;
  const loai = typeof r.loai === "string" ? r.loai : null;
  if (!id || !tieuDe || !loai) return null;
  if (loai === "moc" || loai === "canvas_binh_luan") return null;
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

/** Mentions từ cùng jsonb `ngu_canh` (kể cả khi không có card ngữ cảnh). */
export function parseChatMessageMentions(raw: unknown): ChatMentionRef[] {
  return parseChatMentions(raw);
}

const MOC_SU_KIEN: ChatMocNoticeSuKien[] = ["tao", "nhac_truoc", "den_han"];

/** Parse payload nhắc mốc từ `ngu_canh` (loai=moc). */
export function parseChatMocNhac(raw: unknown): ChatMocNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.loai !== "moc") return null;
  const mocId = typeof r.id === "string" ? r.id : null;
  const ten = typeof r.tieuDe === "string" ? r.tieuDe : null;
  const suKienRaw = typeof r.mocSuKien === "string" ? r.mocSuKien : null;
  const thoiDiem = typeof r.thoiDiem === "string" ? r.thoiDiem : null;
  if (!mocId || !ten || !suKienRaw || !thoiDiem) return null;
  if (!MOC_SU_KIEN.includes(suKienRaw as ChatMocNoticeSuKien)) return null;
  return {
    mocId,
    suKien: suKienRaw as ChatMocNoticeSuKien,
    ten,
    thoiDiem,
    url: typeof r.href === "string" ? r.href : null,
    moTa: typeof r.moTa === "string" ? r.moTa : null,
  };
}

/** Parse tin «vừa có bình luận» trên canvas. */
export function parseChatCanvasBinhLuan(
  raw: unknown,
): ChatCanvasBinhLuanNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.loai !== "canvas_binh_luan") return null;
  const canvasId = typeof r.id === "string" ? r.id : null;
  const tenNguoi = typeof r.tieuDe === "string" ? r.tieuDe.trim() : "";
  if (!canvasId || !tenNguoi) return null;
  const nodeIds = Array.isArray(r.nodeIds)
    ? r.nodeIds.filter((id): id is string => typeof id === "string")
    : [];
  const soLuong =
    typeof r.soLuong === "number" && Number.isFinite(r.soLuong)
      ? Math.max(1, Math.floor(r.soLuong))
      : Math.max(1, nodeIds.length);
  return {
    canvasId,
    soLuong,
    nodeIds,
    tenNguoi,
    avatarUrl: typeof r.avatarUrl === "string" ? r.avatarUrl : null,
  };
}

/** Cờ tin chuyển tiếp — `ngu_canh.chuyenTiep` (không phải card ngữ cảnh). */
export function parseChatForwarded(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return (raw as Record<string, unknown>).chuyenTiep === true;
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
