/** Cloudflare Images id từ URL imagedelivery.net/{hash}/{id}/{variant}. */
export function extractCfImageIdFromDeliveryUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("imagedelivery.net")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[1]?.trim() || null;
  } catch {
    return null;
  }
}
