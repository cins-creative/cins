import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongListItem } from "@/lib/truong/types";

export type SchoolCoverFields = Pick<
  TruongListItem,
  "cover_id" | "cover_src"
>;

export function resolveSchoolCoverSrc(
  school: SchoolCoverFields,
  previewUrl?: string | null,
): string | null {
  if (previewUrl?.trim()) return previewUrl.trim();
  if (school.cover_src?.trim()) return school.cover_src.trim();
  return getCfImageUrlWithFallbacks(school.cover_id, [
    "public",
    "cover",
    "medium",
  ]);
}
