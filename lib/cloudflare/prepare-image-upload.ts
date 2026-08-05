/**
 * Chuẩn bị File ảnh trước khi đưa lên Cloudflare Images.
 * Cùng pipeline nén với port-clone / upload-from-url:
 * - ≤ 10MB → giữ nguyên (GIF động không mất animation)
 * - > 10MB và ≤ 40MB → sharp resize + nén (GIF → frame đầu JPEG)
 * - > 40MB hoặc nén thất bại → lỗi
 */
import "server-only";

import {
  MAX_BYTES_DOWNLOAD_DE_NEN,
  nenAnhDuoiTranUpload,
} from "@/lib/cloudflare/compress-image-for-upload";
import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import {
  inferImageMime,
  UPLOAD_IMAGE_MIMES,
} from "@/lib/files/infer-image-mime";

export type PrepareImageUploadOk = {
  ok: true;
  file: File;
  daNen: boolean;
  soByteGoc: number;
  soByteSau: number;
};

export type PrepareImageUploadFail = {
  ok: false;
  error: string;
  status: 400 | 413;
};

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/**
 * Validate MIME + nén nếu vượt trần CF Images.
 */
export async function prepareImageFileForCloudflareUpload(
  file: File,
): Promise<PrepareImageUploadOk | PrepareImageUploadFail> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Thiếu file ảnh.", status: 400 };
  }

  const mime = inferImageMime(file);
  if (!UPLOAD_IMAGE_MIMES.has(mime)) {
    return {
      ok: false,
      error: "Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.",
      status: 400,
    };
  }

  const soByteGoc = file.size;

  if (soByteGoc <= MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES) {
    const normalized =
      file.type === mime
        ? file
        : new File([file], file.name || `upload.${extensionForMime(mime)}`, {
            type: mime,
          });
    return {
      ok: true,
      file: normalized,
      daNen: false,
      soByteGoc,
      soByteSau: soByteGoc,
    };
  }

  if (soByteGoc > MAX_BYTES_DOWNLOAD_DE_NEN) {
    return {
      ok: false,
      error: cloudflareImageTooLargeError(),
      status: 413,
    };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const nen = await nenAnhDuoiTranUpload(buf, { mimeGoc: mime });
  if (!nen) {
    return {
      ok: false,
      error: cloudflareImageTooLargeError(),
      status: 413,
    };
  }

  const baseName = (file.name || "upload").replace(/\.[^.]+$/, "") || "upload";
  const out = new File(
    [new Uint8Array(nen.buffer)],
    `${baseName}.${extensionForMime(nen.mime)}`,
    { type: nen.mime },
  );

  return {
    ok: true,
    file: out,
    daNen: true,
    soByteGoc: nen.soByteGoc,
    soByteSau: nen.soByteSau,
  };
}
