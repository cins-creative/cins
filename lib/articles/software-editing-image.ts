import { getCoverUrl } from "@/lib/articles/cover";
import { resolveEditorialImageUrl } from "@/lib/nganh/editorialImage";

/** URL ảnh inline khi admin sửa — không fallback server sau khi user xóa. */
export function resolveSoftwareEditingImageUrl(
  imageId: string,
  previewUrl: string | null,
  articleImageId: string | null | undefined,
  serverUrl?: string | null,
): string | null {
  const preview = previewUrl?.trim();
  if (preview) return preview;

  const id = imageId.trim();
  if (id) {
    return getCoverUrl(id) || resolveEditorialImageUrl(id) || null;
  }

  const baseline = (articleImageId ?? "").trim();
  const dirty = previewUrl !== null || id !== baseline;
  if (dirty) return null;

  return serverUrl?.trim() || getCoverUrl(baseline) || null;
}
