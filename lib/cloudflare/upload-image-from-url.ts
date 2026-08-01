/**
 * Tải ảnh từ URL public an toàn → upload Cloudflare Images.
 * Dùng auto-cover embed (OG / oEmbed / YouTube thumb) và port-clone.
 * Ảnh >10MB: thử nén (sharp) rồi upload; vẫn thất bại → `qua_lon`.
 */

import {
  MAX_BYTES_DOWNLOAD_DE_NEN,
  nenAnhDuoiTranUpload,
} from "@/lib/cloudflare/compress-image-for-upload";
import { MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES } from "@/lib/cloudflare/image-upload-limits";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { isSafePublicHttpUrl } from "@/lib/link/og-preview";

const FETCH_TIMEOUT_MS = 10_000;
const FETCH_TIMEOUT_NEN_MS = 60_000;
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
  | {
      ok: true;
      data: { imageId: string; url: string };
      /** Đã nén xuống dưới trần trước khi upload. */
      daNen?: boolean;
      soByteGoc?: number;
      soByteSau?: number;
    }
  | { ok: false; lyDo: LyDoUploadAnhThatBai; soByte?: number };

async function docBodyGioiHan(
  res: Response,
  limit: number,
): Promise<ArrayBuffer | null> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > limit) return null;
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    total += value.byteLength;
    if (total > limit) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

/**
 * Bản chi tiết — caller cần phân biệt "quá nặng" với "lỗi mạng" (vd. port import
 * báo cho user biết bao nhiêu ảnh bị rớt / đã nén).
 */
export async function uploadCloudflareImageFromUrlChiTiet(
  imageUrl: string,
  opts?: { headers?: Record<string, string> },
): Promise<KetQuaUploadAnhTuUrl> {
  if (!isSafePublicHttpUrl(imageUrl)) {
    return { ok: false, lyDo: "url_khong_an_toan" };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(
    () => controller.abort(),
    FETCH_TIMEOUT_MS,
  );

  const resetTimer = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), ms);
  };

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

    const soByteKhaiBao = Number(res.headers.get("content-length") || 0);
    const khaiBaoHopLe = Number.isFinite(soByteKhaiBao) && soByteKhaiBao > 0;
    const canNen = khaiBaoHopLe && soByteKhaiBao > MAX_BYTES;

    if (canNen && soByteKhaiBao > MAX_BYTES_DOWNLOAD_DE_NEN) {
      await res.body?.cancel().catch(() => {});
      return { ok: false, lyDo: "qua_lon", soByte: soByteKhaiBao };
    }

    if (canNen) {
      resetTimer(FETCH_TIMEOUT_NEN_MS);
    }

    const buf = await docBodyGioiHan(
      res,
      canNen || !khaiBaoHopLe ? MAX_BYTES_DOWNLOAD_DE_NEN : MAX_BYTES,
    );
    if (!buf || !buf.byteLength) {
      return {
        ok: false,
        lyDo: buf === null && (canNen || !khaiBaoHopLe) ? "qua_lon" : "tai_that_bai",
        soByte: soByteKhaiBao || undefined,
      };
    }

    let uploadBuf: ArrayBuffer | Buffer = buf;
    let uploadMime = mime;
    let daNen = false;
    let soByteGoc: number | undefined;
    let soByteSau: number | undefined;

    if (buf.byteLength > MAX_BYTES) {
      const nen = await nenAnhDuoiTranUpload(buf, { mimeGoc: mime });
      if (!nen) {
        return { ok: false, lyDo: "qua_lon", soByte: buf.byteLength };
      }
      uploadBuf = nen.buffer;
      uploadMime = nen.mime;
      daNen = true;
      soByteGoc = nen.soByteGoc;
      soByteSau = nen.soByteSau;
    }

    const bytes = Buffer.isBuffer(uploadBuf)
      ? new Uint8Array(uploadBuf)
      : new Uint8Array(uploadBuf);
    const file = new File(
      [bytes],
      `embed-thumb.${extensionForMime(uploadMime)}`,
      { type: uploadMime },
    );
    const uploaded = await uploadToCloudflareImages(file);
    if (!uploaded.ok) return { ok: false, lyDo: "luu_tru_that_bai" };
    return {
      ok: true,
      data: uploaded.data,
      ...(daNen ? { daNen: true, soByteGoc, soByteSau } : {}),
    };
  } catch {
    return { ok: false, lyDo: "tai_that_bai" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function uploadCloudflareImageFromUrl(
  imageUrl: string,
  opts?: { headers?: Record<string, string> },
): Promise<{ imageId: string; url: string } | null> {
  const res = await uploadCloudflareImageFromUrlChiTiet(imageUrl, opts);
  return res.ok ? res.data : null;
}
