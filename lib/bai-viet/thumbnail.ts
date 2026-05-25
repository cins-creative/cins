import { resolveAdminArticleThumbSrc } from "@/lib/admin/article-display";

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
