import type { ShopeeParsedIds } from "./types";

const SHOPEE_HOST_RE = /(?:^|\.)shopee\.(?:vn|com|com\.my|co\.th|co\.id|ph|sg|tw)$/i;

/**
 * Parse shopId + itemId từ URL Shopee.
 * Hỗ trợ: …-i.{shop}.{item}, /product/{shop}/{item}, query.
 */
export function parseShopeeProductUrl(raw: string): ShopeeParsedIds | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!SHOPEE_HOST_RE.test(url.hostname)) return null;

  const path = url.pathname;

  const iDot = path.match(/-i\.(\d+)\.(\d+)/i);
  if (iDot) {
    return {
      shopId: iDot[1]!,
      itemId: iDot[2]!,
      sourceUrl: url.toString(),
    };
  }

  const product = path.match(/\/product\/(\d+)\/(\d+)/i);
  if (product) {
    return {
      shopId: product[1]!,
      itemId: product[2]!,
      sourceUrl: url.toString(),
    };
  }

  const shopQ = url.searchParams.get("shop_id") ?? url.searchParams.get("shopid");
  const itemQ = url.searchParams.get("item_id") ?? url.searchParams.get("itemid");
  if (shopQ && itemQ && /^\d+$/.test(shopQ) && /^\d+$/.test(itemQ)) {
    return {
      shopId: shopQ,
      itemId: itemQ,
      sourceUrl: url.toString(),
    };
  }

  return null;
}

export function shopeeCanonicalProductUrl(shopId: string, itemId: string): string {
  return `https://shopee.vn/product/${shopId}/${itemId}`;
}

export function shopeeImageUrl(imageKeyOrUrl: string): string {
  const t = imageKeyOrUrl.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t.split("?")[0] ?? t;
  return `https://down-vn.img.susercontent.com/file/${t}`;
}

export function isLikelyVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("/video/") ||
    u.includes("mms.susercontent") ||
    /\.(mp4|webm|m3u8)(\?|$)/i.test(u)
  );
}
