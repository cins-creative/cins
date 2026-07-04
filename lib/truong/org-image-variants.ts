import type { CfImageVariant } from "@/lib/truong/images";

/** Avatar org — 64×64. */
export const ORG_AVATAR_VARIANTS: CfImageVariant[] = ["avatar", "public"];

/** Cover hero banner — ảnh lớn. */
export const ORG_COVER_VARIANTS: CfImageVariant[] = ["public", "grid"];

/** Thumb gallery / bài đăng org — 16:9 nhẹ. */
export const ORG_GALLERY_THUMB_VARIANTS: CfImageVariant[] = [
  "grid",
  "gridsm",
  "public",
];

/** Cover bài đăng trong feed org. */
export const ORG_BAIDANG_COVER_VARIANTS: CfImageVariant[] = [
  "grid",
  "gridsm",
  "public",
];
