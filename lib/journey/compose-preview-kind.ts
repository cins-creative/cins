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

/** Block editor client — `t` + seed blob/CF đều tính là có ảnh khi chọn badge. */
export type ComposeEditorBlockLike = {
  t: string;
  imgs?: string[];
  embedUrl?: string;
};

function editorBlockHasImageSeed(block: ComposeEditorBlockLike): boolean {
  if (block.t !== "imgs") return false;
  return (block.imgs ?? []).some((seed) => {
    const trimmed = typeof seed === "string" ? seed.trim() : "";
    if (!trimmed) return false;
    return !/^new-/.test(trimmed);
  });
}

function editorBlocksArePhotoAlbumOnly(
  blocks: ReadonlyArray<ComposeEditorBlockLike>,
): boolean {
  if (!blocks.some((b) => b.t === "imgs")) return false;
  if (blocks.some((b) => b.t === "embed")) return false;
  return blocks.every(
    (b) => b.t === "imgs" || b.t === "body" || b.t === "spacer",
  );
}

/**
 * Badge compose — nhìn blocks đang soạn (kể cả blob đang upload), không chỉ
 * payload server sau `toServerBlocks` (blob bị lọc → badge "Chỉ chữ" sai).
 */
export function inferComposePreviewKindFromEditor(
  blocks: ReadonlyArray<ComposeEditorBlockLike>,
  coverSeed: string | null,
  serverBlocks: ServerBlock[],
): ComposePreviewKind {
  const hasEmbed = blocks.some(
    (b) => b.t === "embed" && Boolean(b.embedUrl?.trim()),
  );
  const hasImgs = blocks.some(editorBlockHasImageSeed);

  if (hasEmbed && !hasImgs) return "video";
  if (hasImgs && !hasEmbed && editorBlocksArePhotoAlbumOnly(blocks)) {
    return "photo";
  }

  return inferComposePreviewKind(serverBlocks, coverSeed);
}
