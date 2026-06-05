import {
  clientUrlFromThumbnailValue,
  normalizeArticleThumbnailValue,
  resolveAdminArticleThumbSrc,
} from "@/lib/admin/article-display";
import { getCoverUrl } from "@/lib/articles/cover";

/** Đổi variant cuối trên URL Cloudflare Images (hub dùng `thumbnail` cho thẻ). */
export function cfDeliveryUrlWithVariant(
  url: string,
  variant: string,
): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("imagedelivery.net")) return url;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 3) return url;
    parts[parts.length - 1] = variant;
    u.pathname = `/${parts.join("/")}`;
    return u.href;
  } catch {
    return url;
  }
}

/** Resolve thumbnail/cover URL trên server (CF API khi thiếu account hash public). */
export async function resolveHubArticleImages(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
}): Promise<{ thumb_url: string | null; cover_url: string | null }> {
  const { src } = await resolveAdminArticleThumbSrc(row);
  if (!src) return { thumb_url: null, cover_url: null };
  const hubSrc = src.includes("imagedelivery.net")
    ? cfDeliveryUrlWithVariant(src, "thumbnail")
    : src;
  return { thumb_url: hubSrc, cover_url: hubSrc };
}

/** Sync URL cho list/card — tránh N async CF API trên hub/detail. */
export function resolveHubArticleThumbSync(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
}): string | null {
  const thumb = normalizeArticleThumbnailValue(row.thumbnail);
  if (thumb) {
    const sync =
      clientUrlFromThumbnailValue(thumb) ??
      getCoverUrl(thumb, "thumbnail") ??
      getCoverUrl(thumb, "public");
    if (sync) {
      return sync.includes("imagedelivery.net")
        ? cfDeliveryUrlWithVariant(sync, "thumbnail")
        : sync;
    }
  }
  const cover = row.cover_id?.trim();
  if (!cover) return null;
  const sync = getCoverUrl(cover, "thumbnail") ?? getCoverUrl(cover, "public");
  if (!sync) return null;
  return sync.includes("imagedelivery.net")
    ? cfDeliveryUrlWithVariant(sync, "thumbnail")
    : sync;
}
