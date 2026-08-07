import type { ChatShopDonKhaoSatNotice } from "@/lib/chat/types";

/** Parse tin khảo sát nhận hàng từ `ngu_canh` (loai=shop_don_khao_sat). */
export function parseChatShopDonKhaoSat(
  raw: unknown,
): ChatShopDonKhaoSatNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.loai !== "shop_don_khao_sat") return null;
  const donId = typeof r.id === "string" ? r.id.trim() : "";
  if (!donId) return null;
  const maDon =
    typeof r.tieuDe === "string" && r.tieuDe.trim()
      ? r.tieuDe.trim()
      : null;
  return { donId, maDon };
}

/** Tin cũ (chỉ body) — trích mã đơn để hiện CTA (resolve id qua API buyer). */
export function shopDonKhaoSatTuBody(
  body: string,
): ChatShopDonKhaoSatNotice | null {
  const t = body.trim();
  if (!t) return null;
  if (
    !/nhận hàng/i.test(t) &&
    !/chưa nhận/i.test(t) &&
    !/xác nhận đã nhận/i.test(t)
  ) {
    return null;
  }
  const m = t.match(/(?:đơn|cho đơn)\s+([A-Z0-9][A-Z0-9-]*\d)/i);
  if (!m?.[1]) return null;
  return { donId: "", maDon: m[1].toUpperCase() };
}
