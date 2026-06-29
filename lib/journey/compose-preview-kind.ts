import type { Block as ServerBlock } from "@/lib/editor/types";

import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";

/** Dạng card khi render — badge trong trình soạn. */
export type ComposePreviewKind = "text" | "photo" | "video" | "article";

export const COMPOSE_PREVIEW_LABELS: Record<
  ComposePreviewKind,
  { label: string; hint: string }
> = {
  text: {
    label: "Chỉ chữ",
    hint: "Card chữ lớn kiểu Facebook — không cần ảnh bìa",
  },
  photo: {
    label: "Ảnh",
    hint: "Album ảnh trên timeline",
  },
  video: {
    label: "Video",
    hint: "Video với khung cover + thời lượng",
  },
  article: {
    label: "Bài viết",
    hint: "Bài dài với nhiều block",
  },
};

export function inferComposePreviewKind(
  blocks: ServerBlock[],
  coverSeed: string | null,
): ComposePreviewKind {
  const hasCover = Boolean(coverSeed?.trim());
  return milestoneCardContentKind(blocks, hasCover, null);
}
