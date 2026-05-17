/** Tên variant cuối path imagedelivery.net (trước query). */
function variantNameFromDeliveryUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    return last || null;
  } catch {
    return null;
  }
}

/**
 * Chọn URL hiển thị từ mảng `variants` Cloudflare Images trả sau upload.
 * API thường trả `thumbnail` (300×300) trước — không dùng làm mặc định khi đã có `public`.
 *
 * Env (tùy chọn, tạo variant tương ứng trong Cloudflare Images):
 * - `CLOUDFLARE_IMAGES_ARTICLE_VARIANT` — ưu tiên cho ảnh trong bài / editor
 * - `CLOUDFLARE_IMAGES_VARIANT` — fallback chung (career thumbnail, v.v.)
 *
 * Thứ tự ưu tiên: env → **public** (mặc định CF thường 1366×768…) → full → 1920 → … → bỏ `thumbnail` cuối cùng.
 */
export function pickImageDeliveryUrl(
  variants: readonly string[] | null | undefined,
): string | null {
  if (!variants?.length) return null;

  const fromEnv =
    process.env.CLOUDFLARE_IMAGES_ARTICLE_VARIANT?.trim() ||
    process.env.CLOUDFLARE_IMAGES_VARIANT?.trim();

  const preferredNames = [
    fromEnv,
    "public",
    "full",
    "1920",
    "1600",
    "large",
    "article",
  ].filter((n): n is string => Boolean(n));

  for (const name of preferredNames) {
    const hit = variants.find(
      (u) => variantNameFromDeliveryUrl(u)?.toLowerCase() === name.toLowerCase(),
    );
    if (hit) return hit;
  }

  const notThumb = variants.filter(
    (u) => variantNameFromDeliveryUrl(u)?.toLowerCase() !== "thumbnail",
  );
  if (notThumb.length > 0) return notThumb[0]!;

  return variants[0] ?? null;
}
