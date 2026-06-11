import {
  isMonThiCloudflareImageId,
  isMonThiPlaceholderId,
  resolveMonThiThumbnailUrl,
} from "@/lib/truong/mon-thi-thumbnail";

/** URL hiển thị admin — ưu tiên ảnh CF trên `thumbnail_id`, rồi fallback cover bài. */
export function getAdminMonThiThumbDisplayUrl(row: {
  thumbnail_id?: string | null;
  thumbnail_src?: string | null;
}): string | null {
  const fromCatalog = resolveMonThiThumbnailUrl(row.thumbnail_id);
  if (fromCatalog) return fromCatalog;
  if (row.thumbnail_src?.trim()) return row.thumbnail_src.trim();
  return null;
}

/** Ảnh lấy từ cover bài `id_bai_viet`, chưa upload CF riêng cho môn. */
export function isAdminMonThiThumbFromArticleCover(row: {
  thumbnail_id?: string | null;
  id_bai_viet?: string | null;
  thumbnail_from_cover?: boolean;
}): boolean {
  if (row.thumbnail_from_cover) return true;
  if (isMonThiCloudflareImageId(row.thumbnail_id)) return false;
  return Boolean(row.id_bai_viet?.trim());
}

export function isAdminMonThiPlaceholderThumb(row: {
  thumbnail_id?: string | null;
}): boolean {
  const id = row.thumbnail_id?.trim();
  if (!id) return true;
  return isMonThiPlaceholderId(id);
}

export function hasAdminMonThiRealThumb(row: {
  thumbnail_id?: string | null;
}): boolean {
  return isMonThiCloudflareImageId(row.thumbnail_id);
}
