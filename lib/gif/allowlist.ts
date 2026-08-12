import { isSafePublicHttpUrl } from "@/lib/link/og-preview";

/** Chỉ CDN Giphy — chống SSRF khi import. */
export function isAllowedGifCdnUrl(raw: string): boolean {
  if (!isSafePublicHttpUrl(raw)) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return host === "giphy.com" || host.endsWith(".giphy.com");
}
