const STORAGE_KEY = "cins-cf-images-account-hash";

let memoryHash: string | null = null;

export function extractCfAccountHashFromDeliveryUrl(
  url: string,
): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("imagedelivery.net")) return null;
    const hash = u.pathname.split("/").filter(Boolean)[0];
    return hash?.trim() || null;
  } catch {
    return null;
  }
}

export function rememberCfAccountHashFromDeliveryUrl(url: string): void {
  const hash = extractCfAccountHashFromDeliveryUrl(url);
  if (!hash) return;
  memoryHash = hash;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, hash);
  } catch {
    /* ignore */
  }
}

export function getCfAccountHash(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH?.trim();
  if (fromEnv) return fromEnv;

  if (memoryHash) return memoryHash;

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)?.trim();
      if (stored) {
        memoryHash = stored;
        return stored;
      }
    } catch {
      /* ignore */
    }
  }

  return process.env.CLOUDFLARE_IMAGES_HASH?.trim() || null;
}
