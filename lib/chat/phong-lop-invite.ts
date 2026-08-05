import type { ChatPhongLopInvite } from "@/lib/chat/types";

/** Parse CTA mở phòng lớp sau xác nhận học phí (`ngu_canh.loai=phong_lop`). */
export function parseChatPhongLopInvite(raw: unknown): ChatPhongLopInvite | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.loai !== "phong_lop") return null;
  const roomId = typeof o.roomId === "string" ? o.roomId.trim() : "";
  const orgId = typeof o.orgId === "string" ? o.orgId.trim() : "";
  if (!roomId || !orgId) return null;
  return {
    roomId,
    orgId,
    lopId: typeof o.lopId === "string" ? o.lopId.trim() || null : null,
    tenPhong:
      typeof o.tenPhong === "string" && o.tenPhong.trim()
        ? o.tenPhong.trim()
        : null,
  };
}
