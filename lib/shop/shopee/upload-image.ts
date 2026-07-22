/**
 * Upload ảnh CDN Shopee → Cloudflare Images.
 * CDN đôi khi trả MIME lệch / cần Referer — sniff magic bytes.
 */

import { MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES } from "@/lib/cloudflare/image-upload-limits";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { isSafePublicHttpUrl } from "@/lib/link/og-preview";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES;

function mimeFromMagic(buf: ArrayBuffer): string | null {
  const u = new Uint8Array(buf);
  if (u.length < 12) return null;
  // JPEG
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return "image/jpeg";
  // PNG
  if (
    u[0] === 0x89 &&
    u[1] === 0x50 &&
    u[2] === 0x4e &&
    u[3] === 0x47
  ) {
    return "image/png";
  }
  // GIF
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return "image/gif";
  // WEBP: RIFF....WEBP
  if (
    u[0] === 0x52 &&
    u[1] === 0x49 &&
    u[2] === 0x46 &&
    u[3] === 0x46 &&
    u[8] === 0x57 &&
    u[9] === 0x45 &&
    u[10] === 0x42 &&
    u[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function candidateUrls(imageUrl: string): string[] {
  const base = imageUrl.split("?")[0]!.trim();
  if (!base) return [];
  const out = [base];
  if (!/\.(jpe?g|png|webp|gif)$/i.test(base)) {
    out.push(`${base}.webp`);
    out.push(`${base}@resize_w750_nl.webp`);
  }
  return out;
}

async function fetchBytes(
  url: string,
): Promise<{ buf: ArrayBuffer; mime: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://shopee.vn/",
      },
    });
    if (!res.ok) return null;
    if (!isSafePublicHttpUrl(res.url || url)) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_BYTES) return null;
    const headerMime = (res.headers.get("content-type") ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    const magic = mimeFromMagic(buf);
    const mime =
      magic ||
      (headerMime === "image/jpg" ? "image/jpeg" : headerMime) ||
      null;
    if (
      !mime ||
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)
    ) {
      return null;
    }
    return { buf, mime };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadShopeeImageToCloudflare(
  imageUrl: string,
): Promise<{ imageId: string; url: string } | null> {
  if (!isSafePublicHttpUrl(imageUrl)) return null;

  for (const candidate of candidateUrls(imageUrl)) {
    const got = await fetchBytes(candidate);
    if (!got) continue;
    const file = new File(
      [got.buf],
      `shopee.${extensionForMime(got.mime)}`,
      { type: got.mime },
    );
    const uploaded = await uploadToCloudflareImages(file);
    if (uploaded.ok) return uploaded.data;
  }
  return null;
}
