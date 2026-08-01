/**
 * Nén ảnh xuống dưới trần Cloudflare Images (~10MB) trước khi upload.
 * Dùng sharp (nodejs). GIF động → frame đầu JPEG (mất animation).
 *
 * Ảnh strip dài (Behance dọc, vd 1400×14000): KHÔNG fit vào ô vuông
 * (cạnh ngắn bị ép còn ~128px → vỡ). Thay vào đó giảm chất lượng / cạnh
 * ngắn theo tỉ lệ, giữ sàn cạnh ngắn `STRIP_MIN_SHORT_EDGE`, tôn trọng trần
 * cạnh dài (12000px) và diện tích (~100MP) của Cloudflare.
 */
import "server-only";

import { MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES } from "@/lib/cloudflare/image-upload-limits";

/** Mục tiêu an toàn dưới trần CF (để dư biên header/form). */
export const TARGET_CLOUDFLARE_IMAGE_BYTES = Math.floor(
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES * 0.95,
);

/** Không tải nguồn lớn hơn mức này để nén (tránh RAM / timeout). */
export const MAX_BYTES_DOWNLOAD_DE_NEN = 40 * 1024 * 1024;

/** Trần cạnh dài của Cloudflare Images (px) — không upload vượt mức này. */
const CF_MAX_DIMENSION = 12000;

/** Trần diện tích CF (~100MP) — chừa biên xuống 90MP. */
const CF_MAX_PIXELS = 90 * 1_000_000;

/** Ngưỡng coi là ảnh strip dài (cạnh dài / cạnh ngắn). */
const STRIP_ASPECT_THRESHOLD = 2.2;

/** Sàn cạnh ngắn cho ảnh strip — giữ đủ nét để đọc chữ/UI, không vỡ. */
const STRIP_MIN_SHORT_EDGE = 1080;

export type AnhDaNen = {
  buffer: Buffer;
  mime: "image/jpeg" | "image/webp";
  soByteGoc: number;
  soByteSau: number;
};

type SharpFn = typeof import("sharp");

async function loadSharp(): Promise<SharpFn | null> {
  try {
    const mod = (await import("sharp")) as unknown as {
      default?: SharpFn;
    } & SharpFn;
    /* sharp là CJS — dynamic import có thể bọc `.default`. */
    return typeof mod.default === "function" ? mod.default : mod;
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

  const sharp = sharpMod;
  const soByteGoc = Buffer.isBuffer(input)
    ? input.byteLength
    : input.byteLength;
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const target = opts?.targetBytes ?? TARGET_CLOUDFLARE_IMAGE_BYTES;
  const mimeGoc = (opts?.mimeGoc || "").toLowerCase();

  try {
    /* GIF / animation: lấy frame đầu. */
    const base = sharp(buf, {
      animated: false,
      pages: 1,
      failOn: "none",
    }).rotate();

    const meta = await base.metadata();
    const hasAlpha = Boolean(meta.hasAlpha) && mimeGoc.includes("png");
    /* rotate() có thể xoay theo EXIF — dùng kích thước sau xoay nếu có. */
    const w = meta.autoOrient?.width ?? meta.width ?? 0;
    const h = meta.autoOrient?.height ?? meta.height ?? 0;

    const encodeAt = async (
      resize: {
        width?: number;
        height?: number;
        fit: "inside";
        withoutEnlargement: boolean;
      },
      quality: number,
    ): Promise<{ out: Buffer; mime: "image/jpeg" | "image/webp" }> => {
      const pipeline = sharp(buf, {
        animated: false,
        pages: 1,
        failOn: "none",
      })
        .rotate()
        .resize(resize);

      if (hasAlpha && quality >= 65) {
        return {
          out: await pipeline.webp({ quality, effort: 4 }).toBuffer(),
          mime: "image/webp",
        };
      }
      return {
        out: await pipeline
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer(),
        mime: "image/jpeg",
      };
    };

    const done = (
      out: Buffer,
      mime: "image/jpeg" | "image/webp",
    ): AnhDaNen => ({ buffer: out, mime, soByteGoc, soByteSau: out.byteLength });

    /* Thiếu metadata → dùng ladder ô vuông cũ (an toàn tối thiểu). */
    if (!w || !h) {
      const edges = [6000, 4500, 3200, 2400, 1800, 1280];
      const qualities = [85, 75, 65, 55, 45];
      for (const edge of edges) {
        for (const quality of qualities) {
          const { out, mime } = await encodeAt(
            { width: edge, height: edge, fit: "inside", withoutEnlargement: true },
            quality,
          );
          if (out.byteLength <= target) return done(out, mime);
        }
      }
      return null;
    }

    const shortEdge0 = Math.min(w, h);
    const longEdge0 = Math.max(w, h);
    const aspect = longEdge0 / Math.max(1, shortEdge0);
    const isStrip = aspect >= STRIP_ASPECT_THRESHOLD;

    /* Ladder theo CẠNH NGẮN. Strip: sàn cao (giữ nét), giảm chất lượng
       trước; ảnh thường: cho phép thu nhỏ hơn. */
    const rawLadder = isStrip
      ? [shortEdge0, 1600, 1440, 1280, 1200, STRIP_MIN_SHORT_EDGE]
      : [shortEdge0, 2400, 2000, 1600, 1280, 960, 720];
    const minShort = isStrip ? STRIP_MIN_SHORT_EDGE : 640;
    const shortEdges = Array.from(new Set(rawLadder))
      .filter((se) => se <= shortEdge0 && se >= minShort)
      .sort((a, b) => b - a);
    /* Ảnh vốn nhỏ hơn sàn → vẫn thử ở kích thước gốc. */
    if (shortEdges.length === 0) shortEdges.push(shortEdge0);

    const qualities = isStrip
      ? [82, 72, 62, 52, 42]
      : [85, 75, 65, 55, 45];

    /* Ảnh cực dài: nhiều cạnh-ngắn bị CF clamp về cùng size → tránh nén lặp. */
    const seenSizes = new Set<string>();

    for (const se of shortEdges) {
      /* Scale từ cạnh ngắn, rồi kẹp theo trần cạnh dài + diện tích CF. */
      let scale = Math.min(1, se / shortEdge0);
      if (longEdge0 * scale > CF_MAX_DIMENSION) {
        scale = Math.min(scale, CF_MAX_DIMENSION / longEdge0);
      }
      if (w * h * scale * scale > CF_MAX_PIXELS) {
        scale = Math.min(scale, Math.sqrt(CF_MAX_PIXELS / (w * h)));
      }
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));
      const sizeKey = `${targetW}x${targetH}`;
      if (seenSizes.has(sizeKey)) continue;
      seenSizes.add(sizeKey);

      for (const quality of qualities) {
        const { out, mime } = await encodeAt(
          {
            width: targetW,
            height: targetH,
            fit: "inside",
            withoutEnlargement: true,
          },
          quality,
        );
        if (out.byteLength <= target) return done(out, mime);
      }
    }
  } catch (err) {
    console.warn("[compress-image] nén thất bại:", err);
    return null;
  }

  return null;
}
