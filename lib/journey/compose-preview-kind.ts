import { isEditorEmptyImageSeed } from "@/lib/editor/editor-stock-image-seeds";
import type { Block as ServerBlock } from "@/lib/editor/types";

import {
  postDisplayKindToMilestoneCardKind,
  resolvePostDisplayKind,
} from "@/lib/journey/post-content-kind";

/** Dạng card khi render — badge trong trình soạn. */
export type ComposePreviewKind = "text" | "photo" | "video" | "article";

export const COMPOSE_PREVIEW_LABELS: Record<
  ComposePreviewKind,
  { label: string; hint: string }
> = {
  text: {
    label: "Chỉ chữ",
    hint: "Timeline: panel chữ — không hiện trên lưới ảnh",
  },
  photo: {
    label: "Album ảnh",
    hint: "Timeline: album / hero cover — hiện trên lưới",
  },
  video: {
    label: "Video Bunny",
    hint: "Chỉ tiêu đề, mô tả và video — poster lên lưới khi encode xong",
  },
  article: {
    label: "Bài viết",
    hint: "Bài dài nhiều block — thumb trên lưới nếu có ảnh/cover",
  },
};

export function composePreviewVideoOrientationLabel(
  blocks: ServerBlock[],
  coverSeed: string | null,
  moTa?: string | null,
): string | null {
  const { kind, videoOrientation } = resolvePostDisplayKind({
    moTa,
    coverId: coverSeed,
    hasCover: Boolean(coverSeed?.trim()),
    blocks,
  });
  if (kind !== "bunny_video") return null;
  switch (videoOrientation) {
    case "portrait":
      return "Video dọc";
    case "landscape":
      return "Video ngang";
    case "square":
      return "Video vuông";
    default:
      return null;
  }
}

export function inferComposePreviewKind(
  blocks: ServerBlock[],
  coverSeed: string | null,
  moTa?: string | null,
): ComposePreviewKind {
  const kind = resolvePostDisplayKind({
    moTa,
    coverId: coverSeed,
    hasCover: Boolean(coverSeed?.trim()),
    blocks,
  }).kind;

  return postDisplayKindToMilestoneCardKind(kind);
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
    return !isEditorEmptyImageSeed(trimmed);
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
  moTa?: string | null,
): ComposePreviewKind {
  const hasEmbed = blocks.some(
    (b) => b.t === "embed" && Boolean(b.embedUrl?.trim()),
  );
  const hasImgs = blocks.some(editorBlockHasImageSeed);

  if (hasEmbed && !hasImgs) return "video";
  if (hasImgs && !hasEmbed && editorBlocksArePhotoAlbumOnly(blocks)) {
    return "photo";
  }

  return inferComposePreviewKind(serverBlocks, coverSeed, moTa);
}
