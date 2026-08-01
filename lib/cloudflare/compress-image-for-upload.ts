/**
 * Nén ảnh xuống dưới trần Cloudflare Images (~10MB) trước khi upload.
 * Dùng sharp (nodejs). GIF động → frame đầu JPEG (mất animation).
 */
import "server-only";

import { MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES } from "@/lib/cloudflare/image-upload-limits";

/** Mục tiêu an toàn dưới trần CF (để dư biên header/form). */
export const TARGET_CLOUDFLARE_IMAGE_BYTES = Math.floor(
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES * 0.95,
);

/** Không tải nguồn lớn hơn mức này để nén (tránh RAM / timeout). */
export const MAX_BYTES_DOWNLOAD_DE_NEN = 40 * 1024 * 1024;

export type AnhDaNen = {
  buffer: Buffer;
  mime: "image/jpeg" | "image/webp";
  soByteGoc: number;
  soByteSau: number;
};

async function loadSharp(): Promise<typeof import("sharp") | null> {
  try {
    return await import("sharp");
  } catch (err) {
    console.warn("[compress-image] sharp không khả dụng:", err);
    return null;
  }
}

/**
 * Nén buffer ảnh tới ≤ targetBytes.
 * Trả null nếu không nén được (thiếu sharp / vẫn quá lớn).
 */
export async function nenAnhDuoiTranUpload(
  input: ArrayBuffer | Buffer,
  opts?: {
    mimeGoc?: string | null;
    targetBytes?: number;
  },
): Promise<AnhDaNen | null> {
  const sharpMod = await loadSharp();
  if (!sharpMod) return null;

  const sharp = sharpMod.default;
  const soByteGoc = Buffer.isBuffer(input)
    ? input.byteLength
    : input.byteLength;
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const target = opts?.targetBytes ?? TARGET_CLOUDFLARE_IMAGE_BYTES;
  const mimeGoc = (opts?.mimeGoc || "").toLowerCase();

  const edges = [6000, 4500, 3200, 2400, 1800, 1280];
  const qualities = [85, 75, 65, 55, 45];

  try {
    /* GIF / animation: lấy frame đầu. */
    const base = sharp(buf, {
      animated: false,
      pages: 1,
      failOn: "none",
    }).rotate();

    const meta = await base.metadata();
    const hasAlpha = Boolean(meta.hasAlpha) && mimeGoc.includes("png");

    for (const edge of edges) {
      for (const quality of qualities) {
        let pipeline = sharp(buf, {
          animated: false,
          pages: 1,
          failOn: "none",
        }).rotate();

        pipeline = pipeline.resize({
          width: edge,
          height: edge,
          fit: "inside",
          withoutEnlargement: true,
        });

        let out: Buffer;
        let mime: "image/jpeg" | "image/webp";

        if (hasAlpha && quality >= 65) {
          out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
          mime = "image/webp";
        } else {
          out = await pipeline
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
          mime = "image/jpeg";
        }

        if (out.byteLength <= target) {
          return {
            buffer: out,
            mime,
            soByteGoc,
            soByteSau: out.byteLength,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[compress-image] nén thất bại:", err);
    return null;
  }

  return null;
}
