/**
 * Tải ảnh từ URL public an toàn → upload Cloudflare Images.
 * Dùng auto-cover embed (OG / oEmbed / YouTube thumb).
 */

import { MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES } from "@/lib/cloudflare/image-upload-limits";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { isSafePublicHttpUrl } from "@/lib/link/og-preview";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function normalizeMime(raw: string | null): string | null {
  if (!raw) return null;
  const base = raw.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "image/jpg") return "image/jpeg";
  return base || null;
}

export async function uploadCloudflareImageFromUrl(
  imageUrl: string,
): Promise<{ imageId: string; url: string } | null> {
  if (!isSafePublicHttpUrl(imageUrl)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "CINSEmbedThumb/1.0 (+https://cins.vn)",
      },
    });
    if (!res.ok) return null;
    if (!isSafePublicHttpUrl(res.url || imageUrl)) return null;

    const mime = normalizeMime(res.headers.get("content-type"));
    if (!mime || !ALLOWED_MIME.has(mime)) return null;

    const buf = await res.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_BYTES) return null;

    const file = new File(
      [buf],
      `embed-thumb.${extensionForMime(mime)}`,
      { type: mime },
    );
    const uploaded = await uploadToCloudflareImages(file);
    if (!uploaded.ok) return null;
    return uploaded.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
