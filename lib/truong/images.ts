import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import {
  isExternalHttpImageRef,
  isTemporaryImageRef,
} from "@/lib/truong/image-ref";

/** Cloudflare Images — variants theo brief trường đại học. */
export type CfImageVariant = "public" | "avatar" | "cover" | "medium";

const VARIANT_FALLBACK_ORDER: CfImageVariant[] = [
  "public",
  "avatar",
  "cover",
  "medium",
];

export function getCfImageUrl(
  imageId: string | null | undefined,
  variant: CfImageVariant = "public",
): string | null {
  const trimmed = imageId?.trim();
  if (!trimmed) return null;
  if (isTemporaryImageRef(trimmed)) return null;
  if (isExternalHttpImageRef(trimmed)) return trimmed;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${trimmed}/${variant}`;
}

/** Thử nhiều variant — một số tài khoản CF chưa tạo variant `avatar`. */
export function getCfImageUrlWithFallbacks(
  imageId: string | null | undefined,
  preferred: CfImageVariant[] = VARIANT_FALLBACK_ORDER,
): string | null {
  if (!imageId?.trim()) return null;
  for (const variant of preferred) {
    const url = getCfImageUrl(imageId, variant);
    if (url) return url;
  }
  return null;
}
