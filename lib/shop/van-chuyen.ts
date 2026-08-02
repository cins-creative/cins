/** Mã vận đơn + ĐVVC — shop tự ship; CINs không gọi API carrier. */

export const SHOP_VAN_CHUYEN_MA_MAX = 80;

export const SHOP_DVVC_OPTIONS = [
  "ViettelPost",
  "GHN",
  "GHTK",
  "J&T",
  "SPX",
  "Ninja Van",
  "Ahamove",
  "Grab",
  "Khác",
] as const;

export type ShopDvvc = (typeof SHOP_DVVC_OPTIONS)[number];

const DVVC_SET = new Set<string>(SHOP_DVVC_OPTIONS);

/** Chuẩn hóa mã vận đơn (không phải URL). */
export function normalizeVanChuyenMa(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") throw new Error("INVALID_MA");
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return null;
  if (trimmed.length > SHOP_VAN_CHUYEN_MA_MAX) throw new Error("MA_TOO_LONG");
  /* Chặn dán nhầm URL vào ô mã. */
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("://")) {
    throw new Error("INVALID_MA");
  }
  if (!/^[\w./+-]+$/u.test(trimmed)) throw new Error("INVALID_MA");
  return trimmed;
}

export function normalizeVanChuyenDvvc(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") throw new Error("INVALID_DVVC");
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!DVVC_SET.has(trimmed)) throw new Error("INVALID_DVVC");
  return trimmed;
}

/** URL tra cứu công khai theo ĐVVC + mã (buyer mở tab mới). */
export function buildTheoDoiUrl(
  dvvc: string | null | undefined,
  ma: string | null | undefined,
): string | null {
  const code = ma?.trim();
  const carrier = dvvc?.trim();
  if (!code || !carrier) return null;
  const enc = encodeURIComponent(code);
  switch (carrier) {
    case "ViettelPost":
      return `https://www.viettelpost.com.vn/Tracking2?KEY=${enc}`;
    case "GHN":
      return `https://donhang.ghn.vn/?order_code=${enc}`;
    case "GHTK":
      return `https://i.ghtk.vn/${enc}`;
    case "J&T":
      return `https://jtexpress.vn/vi/tracking?type=track&billcode=${enc}`;
    case "SPX":
      return `https://spx.vn/track?id=${enc}`;
    case "Ninja Van":
      return `https://www.ninjavan.co/vi-vn/tracking?id=${enc}`;
    case "Ahamove":
      return `https://app.ahamove.com/`;
    case "Grab":
      return `https://www.grab.com/vn/`;
    case "Khác":
      return null;
    default:
      return null;
  }
}

/** Client: chỉ trả URL http(s) an toàn. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Suy ĐVVC từ URL cũ (backfill / hiển thị legacy). */
export function detectDvvcTuLink(link: string | null | undefined): string | null {
  if (!link?.trim()) return null;
  const s = link.trim();
  if (/viettelpost|viettel/i.test(s)) return "ViettelPost";
  if (/ghn\.|giaohangnhanh/i.test(s)) return "GHN";
  if (/ghtk|giaohangtietkiem/i.test(s)) return "GHTK";
  if (/jtexpress|j&t|jnt/i.test(s)) return "J&T";
  if (/spx\.|shopee/i.test(s)) return "SPX";
  if (/ninjavan/i.test(s)) return "Ninja Van";
  if (/ahamove/i.test(s)) return "Ahamove";
  if (/grab/i.test(s)) return "Grab";
  return "Khác";
}
