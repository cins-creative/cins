import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongListItem } from "@/lib/truong/types";

export function schoolInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "TR";
}

export type SchoolAvatarFields = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src"
>;

export function resolveSchoolAvatarSrc(
  school: SchoolAvatarFields,
  previewUrl?: string | null,
): string | null {
  if (previewUrl?.trim()) return previewUrl.trim();
  if (school.avatar_src?.trim()) return school.avatar_src.trim();

  const id = school.avatar_id ?? school.logo_id;
  if (!id) return null;

  return (
    getCfImageUrlWithFallbacks(school.avatar_id, ["public", "avatar"]) ??
    getCfImageUrlWithFallbacks(school.logo_id, ["public", "avatar"])
  );
}
