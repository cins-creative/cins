import type { Block } from "@/lib/editor/types";
import {
  buildBunnyVideoThumbnailUrl,
  classifyBunnyVideoUrl,
} from "@/lib/bunny/embed";
import {
  blocksAreMediaCaptionOnly,
  blocksAreTextPanelOnly,
  extractAllImageIds,
  extractVideoUrl,
  hasArticleLayoutBlocks,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";

/** Loại hiển thị nội dung — source of truth Phase 1+. */
export type PostDisplayKind = "text" | "album" | "article" | "bunny_video";

export type PostContentResolveInput = {
  moTa?: string | null;
  coverId?: string | null;
  /** Timeline đã resolve preview — tương đương có cover hợp lệ. */
  hasCover?: boolean;
  blocks?: ReadonlyArray<Block> | null;
};

export type PostContentResolution = {
  kind: PostDisplayKind;
  effectiveMoTa: string | null;
  gridVisible: boolean;
  gridThumbSource: "cover" | "first_image" | "video_poster" | null;
};

export type PostPublishValidationResult =
  | { ok: true; resolution: PostContentResolution; blocks: Block[] }
  | { ok: false; error: string; field?: string };

const MAX_MOTA = 280;

const TEXT_LOAI = new Set<Block["loai"]>(["body", "h2", "h3", "quote"]);

function htmlFragmentToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function blockPlainText(block: Block): string {
  const html = block.config?.html;
  return typeof html === "string" ? htmlFragmentToPlainText(html) : "";
}

function meaningfulBlocks(blocks: ReadonlyArray<Block>): Block[] {
  return blocks.filter((b) => b.loai !== "spacer");
}

function firstMeaningfulBlock(
  blocks: ReadonlyArray<Block>,
): Block | null {
  return meaningfulBlocks(blocks)[0] ?? null;
}

function hasTextContentInBlocks(blocks: ReadonlyArray<Block>): boolean {
  for (const block of blocks) {
    if (!TEXT_LOAI.has(block.loai)) continue;
    if (blockPlainText(block)) return true;
  }
  return false;
}

function blocksArePureImageAlbum(blocks: ReadonlyArray<Block>): boolean {
  if (!blocks.length) return false;
  return blocks.every((b) => b.loai === "imgs" || b.loai === "spacer");
}

function hasValidCover(input: PostContentResolveInput): boolean {
  if (input.hasCover) return true;
  const id = input.coverId?.trim();
  return Boolean(id && isPersistedImageSeed(id));
}

function extractYoutubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\/+/, "").split("/")[0];
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
    if (m) return m[2];
  }
  return null;
}

function embedBlocks(blocks: ReadonlyArray<Block>): Block[] {
  return blocks.filter((b) => b.loai === "embed");
}

function isBunnyEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  const bunnyId =
    typeof block.config?.bunnyVideoId === "string"
      ? block.config.bunnyVideoId.trim()
      : "";
  if (bunnyId) return true;
  const url = typeof block.config?.url === "string" ? block.config.url : "";
  return Boolean(url && classifyBunnyVideoUrl(url));
}

function isYoutubeEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  const url = typeof block.config?.url === "string" ? block.config.url : "";
  return Boolean(url.trim() && extractYoutubeId(url));
}

function isBunnyVideoPost(blocks: ReadonlyArray<Block>): boolean {
  const embeds = embedBlocks(blocks);
  if (embeds.length !== 1) return false;
  if (!isBunnyEmbedBlock(embeds[0]!)) return false;
  if (blocks.some((b) => b.loai === "imgs")) return false;
  return blocks.every(
    (b) =>
      b.loai === "embed" ||
      b.loai === "body" ||
      b.loai === "spacer",
  );
}

function hasYoutubeEmbed(blocks: ReadonlyArray<Block>): boolean {
  return embedBlocks(blocks).some(isYoutubeEmbedBlock);
}

function deriveMoTaFromBlocks(blocks: ReadonlyArray<Block>): string {
  for (const block of blocks) {
    if (block.loai !== "body" && block.loai !== "h2" && block.loai !== "h3") {
      continue;
    }
    const plain = blockPlainText(block);
    if (plain) return plain.slice(0, MAX_MOTA);
  }
  return "";
}

/** Mô tả ngắn sau publish — sync block `body` đầu nếu chưa có mo_ta. */
export function resolveEffectiveMoTa(
  moTaInput: string | null | undefined,
  blocks: ReadonlyArray<Block>,
): string | null {
  const trimmed = (moTaInput ?? "").trim().slice(0, MAX_MOTA);
  if (trimmed) return trimmed;

  const first = firstMeaningfulBlock(blocks);
  if (first?.loai === "body") {
    const plain = blockPlainText(first);
    if (plain) return plain.slice(0, MAX_MOTA);
  }

  const fallback = deriveMoTaFromBlocks(blocks);
  return fallback || null;
}

/** Phân loại nội dung — dùng cho card, grid (Phase 2+) và publish. */
export function resolvePostDisplayKind(
  input: PostContentResolveInput,
): PostContentResolution {
  const blocks = input.blocks ?? [];
  const moTaTrimmed = (input.moTa ?? "").trim().slice(0, MAX_MOTA);
  const imageIds = extractAllImageIds(blocks);
  const coverOk = hasValidCover(input);
  const effectiveMoTa = resolveEffectiveMoTa(moTaTrimmed, blocks);

  if (isBunnyVideoPost(blocks)) {
    return {
      kind: "bunny_video",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : "video_poster",
    };
  }

  if (hasYoutubeEmbed(blocks)) {
    return {
      kind: "article",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : imageIds[0] ? "first_image" : null,
    };
  }

  if (moTaTrimmed && hasTextContentInBlocks(blocks)) {
    return {
      kind: "article",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : imageIds[0] ? "first_image" : null,
    };
  }

  if (blocksArePureImageAlbum(blocks) && imageIds.length > 0) {
    return {
      kind: "album",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : "first_image",
    };
  }

  if (!moTaTrimmed) {
    const first = firstMeaningfulBlock(blocks);
    if (first?.loai === "body") {
      const rest = meaningfulBlocks(blocks).slice(1);
      const restIsAlbumOnly =
        rest.length === 0 ||
        rest.every((b) => b.loai === "imgs" || b.loai === "spacer");
      if (restIsAlbumOnly && (imageIds.length > 0 || coverOk)) {
        return {
          kind: "album",
          effectiveMoTa,
          gridVisible: true,
          gridThumbSource: coverOk ? "cover" : "first_image",
        };
      }
    } else if (first && first.loai !== "spacer" && first.loai !== "imgs") {
      return {
        kind: "article",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: coverOk ? "cover" : imageIds[0] ? "first_image" : null,
      };
    }
  }

  if (hasArticleLayoutBlocks(blocks)) {
    return {
      kind: "article",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : imageIds[0] ? "first_image" : null,
    };
  }

  if (imageIds.length > 0 && blocksAreMediaCaptionOnly(blocks)) {
    return {
      kind: "album",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : "first_image",
    };
  }

  if (imageIds.length > 0) {
    return {
      kind: "article",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: coverOk ? "cover" : "first_image",
    };
  }

  if (coverOk && blocksAreTextPanelOnly(blocks)) {
    return {
      kind: "album",
      effectiveMoTa,
      gridVisible: true,
      gridThumbSource: "cover",
    };
  }

  if (blocksAreTextPanelOnly(blocks) || moTaTrimmed || effectiveMoTa) {
    return {
      kind: "text",
      effectiveMoTa,
      gridVisible: false,
      gridThumbSource: null,
    };
  }

  return {
    kind: "text",
    effectiveMoTa: null,
    gridVisible: false,
    gridThumbSource: null,
  };
}

function findInvalidImageBlockReasons(blocks: ReadonlyArray<Block>): string[] {
  const reasons: string[] = [];
  for (const block of blocks) {
    if (block.loai !== "imgs") continue;
    const raw = block.config?.imgs;
    if (!Array.isArray(raw) || raw.length === 0) {
      reasons.push("Album ảnh có block trống — chọn hoặc upload ảnh trước khi đăng.");
      continue;
    }
    for (const seed of raw) {
      if (typeof seed !== "string" || !isPersistedImageSeed(seed.trim())) {
        reasons.push(
          "Có ảnh chưa upload xong hoặc link ảnh không hợp lệ — đợi upload hoàn tất rồi thử lại.",
        );
        break;
      }
    }
  }
  return reasons;
}

function hasPublishableContent(
  blocks: ReadonlyArray<Block>,
  coverId: string | null | undefined,
  resolution: PostContentResolution,
): boolean {
  if (resolution.kind === "bunny_video") {
    return embedBlocks(blocks).some(isBunnyEmbedBlock);
  }
  if (resolution.kind === "text") {
    return Boolean(
      resolution.effectiveMoTa ||
        hasTextContentInBlocks(blocks),
    );
  }
  if (resolution.kind === "album" || resolution.kind === "article") {
    const coverOk =
      Boolean(coverId?.trim() && isPersistedImageSeed(coverId.trim())) ||
      extractAllImageIds(blocks).length > 0 ||
      hasTextContentInBlocks(blocks) ||
      embedBlocks(blocks).length > 0;
    return coverOk;
  }
  return false;
}

/** Validate trước publish/update — chặn ảnh lỗi & nội dung rỗng (#24–26). */
export function validatePostContentForPublish(params: {
  moTa?: string | null;
  coverId?: string | null;
  blocks: ReadonlyArray<Block>;
}): PostPublishValidationResult {
  const blocks = [...params.blocks];
  const coverTrimmed = params.coverId?.trim() || null;

  if (coverTrimmed && !isPersistedImageSeed(coverTrimmed)) {
    return {
      ok: false,
      error:
        "Ảnh bìa chưa upload xong hoặc không hợp lệ — chọn lại ảnh rồi thử publish.",
      field: "coverSeed",
    };
  }

  const imageErrors = findInvalidImageBlockReasons(blocks);
  if (imageErrors.length > 0) {
    return {
      ok: false,
      error: imageErrors[0]!,
      field: "blocks",
    };
  }

  if (isBunnyVideoPost(blocks)) {
    const embed = embedBlocks(blocks)[0];
    const url = typeof embed?.config?.url === "string" ? embed.config.url : "";
    const bunnyId =
      typeof embed?.config?.bunnyVideoId === "string"
        ? embed.config.bunnyVideoId.trim()
        : "";
    if (!url.trim() && !bunnyId) {
      return {
        ok: false,
        error: "Video chưa sẵn sàng — đợi upload hoàn tất rồi thử lại.",
        field: "blocks",
      };
    }
    if (blocks.some((b) => b.loai === "imgs")) {
      return {
        ok: false,
        error: "Bài video Bunny chỉ gồm video — không thêm album ảnh.",
        field: "blocks",
      };
    }
    if (
      blocks.some(
        (b) =>
          b.loai === "h2" ||
          b.loai === "h3" ||
          b.loai === "quote" ||
          b.loai === "palette" ||
          b.loai === "divider" ||
          (b.loai === "imgs" && b.config?.layout === "mosaic"),
      )
    ) {
      return {
        ok: false,
        error: "Bài video Bunny chỉ gồm tiêu đề, mô tả và video.",
        field: "blocks",
      };
    }
  }

  const resolution = resolvePostDisplayKind({
    moTa: params.moTa,
    coverId: coverTrimmed,
    blocks,
  });

  if (!hasPublishableContent(blocks, coverTrimmed, resolution)) {
    return {
      ok: false,
      error: "Bài viết chưa có nội dung hiển thị — thêm chữ, ảnh hoặc video.",
      field: "blocks",
    };
  }

  if (
    blocks.some((b) => b.loai === "imgs") &&
    extractAllImageIds(blocks).length === 0
  ) {
    return {
      ok: false,
      error:
        "Album ảnh chưa có ảnh hiển thị — upload ảnh hoặc mở bài viết để đăng lại.",
      field: "blocks",
    };
  }

  return { ok: true, resolution, blocks };
}

/** Layout timeline card — Phase 2. */
export type PostCardLayout =
  | "text_panel"
  | "text_with_image"
  | "album_hero_grid"
  | "album_single"
  | "album_grid"
  | "article"
  | "video";

export function resolvePostCardLayout(
  input: PostContentResolveInput,
): PostCardLayout {
  const resolution = resolvePostDisplayKind(input);
  const blocks = input.blocks ?? [];
  const imageIds = extractAllImageIds(blocks);
  const coverOk = hasValidCover(input);

  if (resolution.kind === "text") return "text_panel";
  if (resolution.kind === "bunny_video") return "video";
  if (resolution.kind === "article") return "article";

  if (coverOk && imageIds.length > 0) return "album_hero_grid";
  if (coverOk && blocksAreTextPanelOnly(blocks)) return "text_with_image";
  if (coverOk) return "text_with_image";
  if (imageIds.length <= 1) return "album_single";
  return "album_grid";
}

/** Map sang loại card timeline hiện tại. */
export function postDisplayKindToMilestoneCardKind(
  kind: PostDisplayKind,
): "text" | "photo" | "video" | "article" {
  switch (kind) {
    case "text":
      return "text";
    case "album":
      return "photo";
    case "bunny_video":
      return "video";
    case "article":
    default:
      return "article";
  }
}

/** Map sang filter Gallery grid (`photo` / `article` / `video`). */
export function postDisplayKindToGalleryMediaKind(
  kind: PostDisplayKind,
): GalleryMediaKind {
  switch (kind) {
    case "album":
      return "photo";
    case "bunny_video":
      return "video";
    case "article":
    case "text":
    default:
      return "article";
  }
}

/** Kết quả resolve cho Gallery / lưới Journey — Phase 3. */
export type PostGridEntry = {
  mediaKind: GalleryMediaKind;
  coverId: string | null;
  coverSrc: string | null;
  videoProcessing: boolean;
};

/**
 * Quyết định bài có lên grid không + thumb nào.
 * Trả `null` khi ẩn (text thuần, video đang encode, không có thumb).
 */
export function resolvePostGridEntry(
  input: PostContentResolveInput,
): PostGridEntry | null {
  const blocks = input.blocks ?? [];
  const resolution = resolvePostDisplayKind(input);

  if (!resolution.gridVisible) return null;

  const coverTrimmed = input.coverId?.trim() || null;
  const coverOk =
    Boolean(coverTrimmed && isPersistedImageSeed(coverTrimmed)) ||
    Boolean(input.hasCover);
  const imageIds = extractAllImageIds(blocks);
  const mediaKind = postDisplayKindToGalleryMediaKind(resolution.kind);

  const processingMeta = extractVideoProcessingMeta(blocks);
  const videoProcessing =
    resolution.kind === "bunny_video" && processingMeta?.processing === true;

  if (videoProcessing) return null;

  if (resolution.kind === "bunny_video") {
    const videoUrl = extractVideoUrl(blocks);
    const bunny = videoUrl ? classifyBunnyVideoUrl(videoUrl) : null;
    const coverSrc = bunny ? buildBunnyVideoThumbnailUrl(bunny.videoId) : null;
    if (!coverSrc && !coverTrimmed) return null;
    return {
      mediaKind: "video",
      coverId: coverTrimmed,
      coverSrc,
      videoProcessing: false,
    };
  }

  let thumbId: string | null = null;
  switch (resolution.gridThumbSource) {
    case "cover":
      thumbId = coverTrimmed;
      break;
    case "first_image":
      thumbId = imageIds[0] ?? coverTrimmed ?? null;
      break;
    case "video_poster":
      thumbId = coverTrimmed;
      break;
    default:
      thumbId = coverTrimmed ?? imageIds[0] ?? null;
  }

  if (!thumbId || !isPersistedImageSeed(thumbId)) return null;

  return {
    mediaKind,
    coverId: thumbId,
    coverSrc: null,
    videoProcessing: false,
  };
}
