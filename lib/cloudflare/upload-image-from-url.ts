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

export type LyDoUploadAnhThatBai =
  | "url_khong_an_toan"
  | "tai_that_bai"
  | "dinh_dang_khong_ho_tro"
  | "qua_lon"
  | "luu_tru_that_bai";

export type KetQuaUploadAnhTuUrl =
  | { ok: true; data: { imageId: string; url: string } }
  | { ok: false; lyDo: LyDoUploadAnhThatBai; soByte?: number };

/**
 * Bản chi tiết — caller cần phân biệt "quá nặng" với "lỗi mạng" (vd. port import
 * báo cho user biết bao nhiêu GIF bị rớt vì vượt trần).
 */
export async function uploadCloudflareImageFromUrlChiTiet(
  imageUrl: string,
  opts?: { headers?: Record<string, string> },
): Promise<KetQuaUploadAnhTuUrl> {
  if (!isSafePublicHttpUrl(imageUrl)) {
    return { ok: false, lyDo: "url_khong_an_toan" };
  }

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
        ...(opts?.headers || {}),
      },
    });
    if (!res.ok) return { ok: false, lyDo: "tai_that_bai" };
    if (!isSafePublicHttpUrl(res.url || imageUrl)) {
      return { ok: false, lyDo: "url_khong_an_toan" };
    }

    const mime = normalizeMime(res.headers.get("content-type"));
    if (!mime || !ALLOWED_MIME.has(mime)) {
      await res.body?.cancel().catch(() => {});
      return { ok: false, lyDo: "dinh_dang_khong_ho_tro" };
    }

    /* GIF động Behance lên tới hàng trăm MB — chốt theo header, đừng tải về rồi vứt. */
    const soByteKhaiBao = Number(res.headers.get("content-length") || 0);
    if (Number.isFinite(soByteKhaiBao) && soByteKhaiBao > MAX_BYTES) {
      await res.body?.cancel().catch(() => {});
      return { ok: false, lyDo: "qua_lon", soByte: soByteKhaiBao };
    }

    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return { ok: false, lyDo: "tai_that_bai" };
    if (buf.byteLength > MAX_BYTES) {
      return { ok: false, lyDo: "qua_lon", soByte: buf.byteLength };
    }

    const file = new File(
      [buf],
      `embed-thumb.${extensionForMime(mime)}`,
      { type: mime },
    );
    const uploaded = await uploadToCloudflareImages(file);
    if (!uploaded.ok) return { ok: false, lyDo: "luu_tru_that_bai" };
    return { ok: true, data: uploaded.data };
  } catch {
    return { ok: false, lyDo: "tai_that_bai" };
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadCloudflareImageFromUrl(
  imageUrl: string,
  opts?: { headers?: Record<string, string> },
): Promise<{ imageId: string; url: string } | null> {
  const res = await uploadCloudflareImageFromUrlChiTiet(imageUrl, opts);
  return res.ok ? res.data : null;
}
