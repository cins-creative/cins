import { getCoverUrl } from "@/lib/articles/cover";
import type { CfImageVariant } from "@/lib/truong/images";
import { resolveTruongImageSrc } from "@/lib/truong/media-url";

const THUMB_VARIANTS: CfImageVariant[] = ["public", "cover", "medium"];

/** Chuẩn hóa giá trị cột `thumbnail` từ DB. */
export function normalizeArticleThumbnailValue(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s || null;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const from =
      o.url ?? o.src ?? o.id ?? o.thumbnail ?? o.cover_id ?? o.imageId;
    const s = String(from ?? "").trim();
    return s || null;
  }
  const s = String(raw).trim();
  return s || null;
}

/** URL hiển thị từ giá trị cột `thumbnail` (client). */
export function clientUrlFromThumbnailValue(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return getCoverUrl(value, "thumbnail") ?? getCoverUrl(value, "public");
}

/** Server: URL hiển thị từ giá trị `thumbnail` (gọi CF API nếu thiếu account hash). */
export async function resolveArticleThumbnailSrc(
  thumbnail: string | null | undefined,
): Promise<string | null> {
  const thumb = normalizeArticleThumbnailValue(thumbnail);
  if (!thumb) return null;
  if (/^https?:\/\//i.test(thumb)) return thumb;
  if (thumb.startsWith("/")) return thumb;
  return resolveTruongImageSrc(thumb, [...THUMB_VARIANTS]);
}

/** Server: thumbnail trước, không có thì cover_id. */
export async function resolveAdminArticleThumbSrc(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
}): Promise<{ src: string | null; fromCover: boolean }> {
  const thumbSrc = await resolveArticleThumbnailSrc(row.thumbnail);
  if (thumbSrc) return { src: thumbSrc, fromCover: false };

  const cover = row.cover_id?.trim();
  if (!cover) return { src: null, fromCover: false };
  const sync =
    getCoverUrl(cover, "thumbnail") ?? getCoverUrl(cover, "public");
  if (sync) return { src: sync, fromCover: true };
  const coverSrc = await resolveTruongImageSrc(cover, [...THUMB_VARIANTS]);
  return { src: coverSrc, fromCover: Boolean(coverSrc) };
}

/** Có giá trị trong cột `thumbnail` (lọc / thống kê). */
export function hasAdminArticleThumbnail(row: {
  thumbnail?: string | null;
}): boolean {
  return Boolean(normalizeArticleThumbnailValue(row.thumbnail));
}

/** Client fallback khi chưa có `thumbnail_src` từ server. */
export function getAdminArticleThumbDisplayUrl(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
  thumbnail_src?: string | null;
}): string | null {
  if (row.thumbnail_src?.trim()) return row.thumbnail_src.trim();
  const thumb = normalizeArticleThumbnailValue(row.thumbnail);
  if (thumb) {
    const u = clientUrlFromThumbnailValue(thumb);
    if (u) return u;
  }
  const cover = row.cover_id?.trim();
  if (!cover) return null;
  return getCoverUrl(cover, "thumbnail") ?? getCoverUrl(cover, "public");
}

/** @deprecated Dùng `getAdminArticleThumbDisplayUrl` */
export function getAdminArticleThumbUrl(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
  thumbnail_src?: string | null;
}): string | null {
  return getAdminArticleThumbDisplayUrl(row);
}

export function isAdminThumbFromCoverFallback(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
  thumbnail_from_cover?: boolean;
}): boolean {
  if (row.thumbnail_from_cover) return true;
  if (hasAdminArticleThumbnail(row)) return false;
  return Boolean(row.cover_id?.trim());
}
