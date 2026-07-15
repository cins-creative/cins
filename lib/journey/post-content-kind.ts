import type { Block } from "@/lib/editor/types";
import {
  buildEmbedIframeSrc,
  classifyEmbedUrl,
  type EmbedProviderId,
} from "@/lib/editor/embed-providers";
import { embedPlatformLogoSrc } from "@/lib/editor/embed-platform-logos";
import { resolveEmbedGalleryThumbnailSrc } from "@/lib/editor/embed-thumbnail";
import {
  classifyBunnyVideoUrl,
} from "@/lib/bunny/embed";
import {
  blocksAreMediaCaptionOnly,
  blocksArePlainTextOnly,
  extractAllImageIds,
  hasArticleLayoutBlocks,
  type GalleryMediaKind,
} from "@/lib/journey/post-block-helpers";
import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";
import {
  resolveBunnyVideoPreviewMp4FromBlocks,
  resolveBunnyVideoThumbnailFromBlocks,
} from "@/lib/journey/video-embed";
import {
  extractVideoCanvasRatio,
  type VideoCanvasRatio,
  type VideoOrientation,
  videoOrientationFromCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";
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
  /** Chỉ `bunny_video` — tỉ lệ khung lưu trên block embed (`9:16`, `16:9`, …). */
  videoCanvasRatio: VideoCanvasRatio | null;
  /** Chỉ `bunny_video` — dọc / ngang / vuông, suy từ `videoCanvasRatio`. */
  videoOrientation: VideoOrientation | null;
};

export type PostPublishValidationResult =
  | { ok: true; resolution: PostContentResolution; blocks: Block[] }
  | { ok: false; error: string; field?: string };

/** Mô tả bài (`tom_tat` / `moTa`) — tối đa khi publish. */
export const POST_MOTA_MAX = 15_000;

export function validateMoTaLength(
  moTa: string | null | undefined,
):
  | { ok: true; trimmed: string }
  | { ok: false; error: string; field: "moTa" } {
  const trimmed = (moTa ?? "").trim();
  if (trimmed.length > POST_MOTA_MAX) {
    return {
      ok: false,
      error: `Mô tả tối đa ${POST_MOTA_MAX.toLocaleString("vi-VN")} ký tự (hiện ${trimmed.length.toLocaleString("vi-VN")}).`,
      field: "moTa",
    };
  }
  return { ok: true, trimmed };
}

const TEXT_LOAI = new Set<Block["loai"]>(["body", "h2", "h3", "quote"]);

function htmlFragmentToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r\n/g, "\n")
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

/** Cover trùng ảnh album → không render banner 21:9 + grid (trùng / crop sai). */
function coverIsInAlbumImages(
  input: PostContentResolveInput,
  imageIds: ReadonlyArray<string>,
): boolean {
  const coverId = input.coverId?.trim();
  if (!coverId || !isPersistedImageSeed(coverId)) return false;
  return imageIds.some((id) => id === coverId);
}

function embedBlocks(blocks: ReadonlyArray<Block>): Block[] {
  return blocks.filter((b) => b.loai === "embed");
}

/** URL embed — `config.url` (canonical) hoặc legacy `config.embedUrl`. */
function blockEmbedUrl(block: Block): string {
  const cfg = block.config ?? {};
  if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url.trim();
  if (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) {
    return cfg.embedUrl.trim();
  }
  return "";
}

function isBunnyEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  const bunnyId =
    typeof block.config?.bunnyVideoId === "string"
      ? block.config.bunnyVideoId.trim()
      : "";
  if (bunnyId) return true;
  const url = blockEmbedUrl(block);
  return Boolean(url && classifyBunnyVideoUrl(url));
}

function isInlineIframeEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  if (isBunnyEmbedBlock(block)) return false;
  const url = blockEmbedUrl(block);
  if (!url) return false;
  const cls = classifyEmbedUrl(url);
  if (!cls || cls.provider === "behance") return false;
  return buildEmbedIframeSrc(cls) !== null;
}

function isRiveFileEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  if (block.config?.provider === "rive-file") return true;
  const url = blockEmbedUrl(block);
  if (!url) return false;
  return classifyEmbedUrl(url)?.provider === "rive-file";
}

function isLottieFileEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  if (block.config?.provider === "lottie-file") return true;
  const url = blockEmbedUrl(block);
  if (!url) return false;
  return classifyEmbedUrl(url)?.provider === "lottie-file";
}

function hasInlineIframeEmbed(blocks: ReadonlyArray<Block>): boolean {
  return embedBlocks(blocks).some(isInlineIframeEmbedBlock);
}

function hasRiveFileEmbed(blocks: ReadonlyArray<Block>): boolean {
  return embedBlocks(blocks).some(isRiveFileEmbedBlock);
}

function hasLottieFileEmbed(blocks: ReadonlyArray<Block>): boolean {
  return embedBlocks(blocks).some(isLottieFileEmbedBlock);
}

/** Embed fill peek trên timeline — iframe Tier 1 hoặc file .riv/.lottie host CINs. */
function hasArticleEmbedPeek(blocks: ReadonlyArray<Block>): boolean {
  return (
    hasInlineIframeEmbed(blocks) ||
    hasRiveFileEmbed(blocks) ||
    hasLottieFileEmbed(blocks)
  );
}

function isGalleryEmbedBlock(block: Block): boolean {
  return (
    isInlineIframeEmbedBlock(block) ||
    isRiveFileEmbedBlock(block) ||
    isLottieFileEmbedBlock(block)
  );
}

/** Bài có nhúng Tier 1 / file .riv/.lottie (embed picker). */
export function hasGalleryEmbedContent(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  return blocks.some(isGalleryEmbedBlock);
}

function resolveEmbedProviderFromBlock(
  block: Block,
): EmbedProviderId | null {
  if (isRiveFileEmbedBlock(block)) return "rive-file";
  if (isLottieFileEmbedBlock(block)) return "lottie-file";
  if (!isInlineIframeEmbedBlock(block)) return null;
  const cls = classifyEmbedUrl(blockEmbedUrl(block));
  return cls?.provider ?? null;
}

/** Mọi provider nhúng Tier 1 / file trên bài — dùng lọc feed theo nền tảng. */
export function listGalleryEmbedProviders(
  blocks: ReadonlyArray<Block> | null | undefined,
): EmbedProviderId[] {
  if (!blocks?.length) return [];
  const out: EmbedProviderId[] = [];
  for (const block of blocks) {
    const provider = resolveEmbedProviderFromBlock(block);
    if (provider) out.push(provider);
  }
  return out;
}

/** Provider nhúng đầu tiên — badge logo trên gallery. */
export function resolveGalleryEmbedProvider(
  blocks: ReadonlyArray<Block> | null | undefined,
): EmbedProviderId | null {
  return listGalleryEmbedProviders(blocks)[0] ?? null;
}

function inlineIframeEmbedResolution(
  effectiveMoTa: string | null,
  coverOk: boolean,
  imageIds: string[],
): Omit<PostContentResolution, "videoCanvasRatio" | "videoOrientation"> {
  return {
    kind: "article",
    effectiveMoTa,
    gridVisible: true,
    gridThumbSource: coverOk ? "cover" : imageIds[0] ? "first_image" : null,
  };
}

/**
 * Chỉ video + caption — card `jcard--video`.
 * Thêm h2 / ảnh / palette / … → bài viết dài (video vẫn ở đầu).
 */
const BUNNY_VIDEO_CAPTION_LOAI = new Set<Block["loai"]>([
  "embed",
  "body",
  "spacer",
]);

function isBunnyVideoPost(blocks: ReadonlyArray<Block>): boolean {
  const embeds = embedBlocks(blocks);
  if (embeds.length !== 1) return false;
  if (!isBunnyEmbedBlock(embeds[0]!)) return false;
  const first = firstMeaningfulBlock(blocks);
  if (!first || !isBunnyEmbedBlock(first)) return false;
  return blocks.every((b) => BUNNY_VIDEO_CAPTION_LOAI.has(b.loai));
}

function bunnyUploadEmbedCount(blocks: ReadonlyArray<Block>): number {
  return embedBlocks(blocks).filter(isBunnyEmbedBlock).length;
}

/** Có đúng một video Bunny (kể cả khi đã thêm block bài viết dài phía dưới). */
function isSingleBunnyUploadPost(blocks: ReadonlyArray<Block>): boolean {
  return bunnyUploadEmbedCount(blocks) === 1;
}

function bunnyVideoResolutionBase(
  effectiveMoTa: string | null,
  coverOk: boolean,
): Omit<PostContentResolution, "videoCanvasRatio" | "videoOrientation"> {
  return {
    kind: "bunny_video",
    effectiveMoTa,
    gridVisible: true,
    gridThumbSource: coverOk ? "cover" : "video_poster",
  };
}

function bunnyVideoPublishCompanionError(
  blocks: ReadonlyArray<Block>,
): string | null {
  if (bunnyUploadEmbedCount(blocks) > 1) {
    return "Mỗi bài chỉ được một video — xóa video thừa rồi thử lại.";
  }
  const firstMeaningful = meaningfulBlocks(blocks)[0];
  if (
    firstMeaningful &&
    !(
      firstMeaningful.loai === "embed" &&
      isBunnyEmbedBlock(firstMeaningful)
    )
  ) {
    return "Video phải nằm ở đầu bài viết.";
  }
  return null;
}

/** Đọc cờ hiển thị thumbnail (`cover_id`) trong thân bài khi xem — lưu trên embed Bunny. */
export function readShowCoverInPost(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  for (const block of blocks) {
    if (!isBunnyEmbedBlock(block)) continue;
    return block.config?.showCoverInPost === true;
  }
  return false;
}

function resolveBunnyVideoMeta(
  blocks: ReadonlyArray<Block>,
): Pick<PostContentResolution, "videoCanvasRatio" | "videoOrientation"> {
  const videoCanvasRatio = extractVideoCanvasRatio(blocks) ?? "16:9";
  return {
    videoCanvasRatio,
    videoOrientation: videoOrientationFromCanvasRatio(videoCanvasRatio),
  };
}

function withBunnyVideoMeta(
  base: Omit<PostContentResolution, "videoCanvasRatio" | "videoOrientation">,
  blocks: ReadonlyArray<Block>,
): PostContentResolution {
  return { ...base, ...resolveBunnyVideoMeta(blocks) };
}

const NON_VIDEO_RESOLUTION_META: Pick<
  PostContentResolution,
  "videoCanvasRatio" | "videoOrientation"
> = {
  videoCanvasRatio: null,
  videoOrientation: null,
};

function deriveMoTaFromBlocks(blocks: ReadonlyArray<Block>): string {
  for (const block of blocks) {
    if (block.loai !== "body" && block.loai !== "h2" && block.loai !== "h3") {
      continue;
    }
    const plain = blockPlainText(block);
    if (plain) return plain;
  }
  return "";
}

/** Mô tả ngắn sau publish — sync block `body` đầu nếu chưa có mo_ta. */
export function resolveEffectiveMoTa(
  moTaInput: string | null | undefined,
  blocks: ReadonlyArray<Block>,
): string | null {
  const trimmed = (moTaInput ?? "").trim();
  if (trimmed) return trimmed;

  const first = firstMeaningfulBlock(blocks);
  if (first?.loai === "body") {
    const plain = blockPlainText(first);
    if (plain) return plain;
  }

  const fallback = deriveMoTaFromBlocks(blocks);
  return fallback || null;
}

/** Bài chỉ chữ — không ảnh/video/cover, không layout bài viết dài. */
function isPlainTextOnlyContent(input: PostContentResolveInput): boolean {
  const blocks = input.blocks ?? [];
  if (hasValidCover(input)) return false;
  if (extractAllImageIds(blocks).length > 0) return false;
  if (hasArticleLayoutBlocks(blocks)) return false;
  if (embedBlocks(blocks).some(isBunnyEmbedBlock)) return false;
  if (hasArticleEmbedPeek(blocks)) return false;

  const moTaTrimmed = (input.moTa ?? "").trim();
  const meaningful = meaningfulBlocks(blocks);

  if (meaningful.length > 0 && blocksArePlainTextOnly(blocks)) return true;
  if (moTaTrimmed && meaningful.length === 0) return true;

  return false;
}

/** Phân loại nội dung — dùng cho card, grid (Phase 2+) và publish. */
function finalizePostContentResolution(
  base: Omit<PostContentResolution, "videoCanvasRatio" | "videoOrientation">,
  blocks: ReadonlyArray<Block>,
): PostContentResolution {
  if (base.kind === "bunny_video") {
    return withBunnyVideoMeta(base, blocks);
  }
  return { ...base, ...NON_VIDEO_RESOLUTION_META };
}

export function resolvePostDisplayKind(
  input: PostContentResolveInput,
): PostContentResolution {
  const blocks = input.blocks ?? [];
  const moTaTrimmed = (input.moTa ?? "").trim();
  const imageIds = extractAllImageIds(blocks);
  const coverOk = hasValidCover(input);
  const effectiveMoTa = resolveEffectiveMoTa(moTaTrimmed, blocks);

  /* Video thuần (+ caption). Có block bài viết dài phía dưới → rơi xuống article. */
  if (isBunnyVideoPost(blocks)) {
    return finalizePostContentResolution(
      bunnyVideoResolutionBase(effectiveMoTa, coverOk),
      blocks,
    );
  }

  if (hasArticleEmbedPeek(blocks)) {
    return finalizePostContentResolution(
      inlineIframeEmbedResolution(effectiveMoTa, coverOk, imageIds),
      blocks,
    );
  }

  if (isPlainTextOnlyContent(input)) {
    return finalizePostContentResolution(
      {
        kind: "text",
        effectiveMoTa,
        gridVisible: false,
        gridThumbSource: null,
      },
      blocks,
    );
  }

  if (blocksArePureImageAlbum(blocks) && imageIds.length > 0) {
    return finalizePostContentResolution(
      {
        kind: "album",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: coverOk ? "cover" : "first_image",
      },
      blocks,
    );
  }

  if (!moTaTrimmed) {
    const first = firstMeaningfulBlock(blocks);
    if (first?.loai === "body") {
      const rest = meaningfulBlocks(blocks).slice(1);
      const restIsAlbumOnly =
        rest.length === 0 ||
        rest.every((b) => b.loai === "imgs" || b.loai === "spacer");
      if (restIsAlbumOnly && (imageIds.length > 0 || coverOk)) {
        return finalizePostContentResolution(
          {
            kind: "album",
            effectiveMoTa,
            gridVisible: true,
            gridThumbSource: coverOk ? "cover" : "first_image",
          },
          blocks,
        );
      }
    } else if (first && first.loai !== "spacer" && first.loai !== "imgs") {
      /* Bunny ở đầu nhưng đã có companion bài viết — article (không ép video card). */
      return finalizePostContentResolution(
        {
          kind: "article",
          effectiveMoTa,
          gridVisible: true,
          gridThumbSource: coverOk
            ? "cover"
            : imageIds[0]
              ? "first_image"
              : isSingleBunnyUploadPost(blocks)
                ? "video_poster"
                : null,
        },
        blocks,
      );
    }
  }

  if (hasArticleLayoutBlocks(blocks)) {
    return finalizePostContentResolution(
      {
        kind: "article",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: coverOk ? "cover" : imageIds[0] ? "first_image" : null,
      },
      blocks,
    );
  }

  if (imageIds.length > 0 && blocksAreMediaCaptionOnly(blocks)) {
    return finalizePostContentResolution(
      {
        kind: "album",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: coverOk ? "cover" : "first_image",
      },
      blocks,
    );
  }

  if (imageIds.length > 0) {
    return finalizePostContentResolution(
      {
        kind: "article",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: coverOk ? "cover" : "first_image",
      },
      blocks,
    );
  }

  /* Video Bunny + block bài viết dài (h2/quote/…) — chưa có ảnh inline. */
  if (isSingleBunnyUploadPost(blocks)) {
    return finalizePostContentResolution(
      {
        kind: "article",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: coverOk ? "cover" : "video_poster",
      },
      blocks,
    );
  }

  if (coverOk && blocksArePlainTextOnly(blocks)) {
    return finalizePostContentResolution(
      {
        kind: "album",
        effectiveMoTa,
        gridVisible: true,
        gridThumbSource: "cover",
      },
      blocks,
    );
  }

  if (blocksArePlainTextOnly(blocks) || moTaTrimmed || effectiveMoTa) {
    if (hasArticleEmbedPeek(blocks)) {
      return finalizePostContentResolution(
        inlineIframeEmbedResolution(effectiveMoTa, coverOk, imageIds),
        blocks,
      );
    }
    return finalizePostContentResolution(
      {
        kind: "text",
        effectiveMoTa,
        gridVisible: false,
        gridThumbSource: null,
      },
      blocks,
    );
  }

  return finalizePostContentResolution(
    {
      kind: "text",
      effectiveMoTa: null,
      gridVisible: false,
      gridThumbSource: null,
    },
    blocks,
  );
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
  tieuDe?: string | null,
): boolean {
  if (resolution.kind === "bunny_video") {
    return embedBlocks(blocks).some(isBunnyEmbedBlock);
  }
  /* Bài chữ/article/album: không bắt buộc field nào — tiêu đề, mô tả, block, ảnh bìa đều tùy chọn. */
  if (
    resolution.kind === "text" ||
    resolution.kind === "article" ||
    resolution.kind === "album"
  ) {
    if (resolution.effectiveMoTa?.trim()) return true;
    if (tieuDe?.trim()) return true;
    if (coverId?.trim() && isPersistedImageSeed(coverId.trim())) return true;
    if (extractAllImageIds(blocks).length > 0) return true;
    if (hasTextContentInBlocks(blocks)) return true;
    if (embedBlocks(blocks).length > 0) return true;
    return true;
  }
  return false;
}

/** Validate trước publish/update — chặn ảnh lỗi & video chưa sẵn sàng (#24–26). */
export function validatePostContentForPublish(params: {
  moTa?: string | null;
  coverId?: string | null;
  tieuDe?: string | null;
  blocks: ReadonlyArray<Block>;
}): PostPublishValidationResult {
  const blocks = [...params.blocks];
  const coverTrimmed = params.coverId?.trim() || null;

  const moTaCheck = validateMoTaLength(params.moTa);
  if (!moTaCheck.ok) {
    return { ok: false, error: moTaCheck.error, field: moTaCheck.field };
  }

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

  if (isBunnyVideoPost(blocks) || isSingleBunnyUploadPost(blocks)) {
    const embed = embedBlocks(blocks).find(isBunnyEmbedBlock);
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
    const companionErr = bunnyVideoPublishCompanionError(blocks);
    if (companionErr) {
      return { ok: false, error: companionErr, field: "blocks" };
    }
  }

  const resolution = resolvePostDisplayKind({
    moTa: moTaCheck.trimmed,
    coverId: coverTrimmed,
    blocks,
  });

  if (
    resolution.effectiveMoTa &&
    resolution.effectiveMoTa.length > POST_MOTA_MAX
  ) {
    return {
      ok: false,
      error: `Mô tả tối đa ${POST_MOTA_MAX.toLocaleString("vi-VN")} ký tự (hiện ${resolution.effectiveMoTa.length.toLocaleString("vi-VN")}).`,
      field: "moTa",
    };
  }

  if (!hasPublishableContent(blocks, coverTrimmed, resolution, params.tieuDe)) {
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
  | "chi_chu"
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

  if (resolution.kind === "text") return "chi_chu";
  if (resolution.kind === "bunny_video") return "video";
  if (resolution.kind === "article") return "article";

  if (coverOk && imageIds.length > 0) {
    /* Cover = ảnh album (vd. cover_id sync từ tấm đầu) → album thuần, không hero. */
    if (coverIsInAlbumImages(input, imageIds)) {
      return imageIds.length <= 1 ? "album_single" : "album_grid";
    }
    return "album_hero_grid";
  }
  if (coverOk && blocksArePlainTextOnly(blocks)) return "text_with_image";
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
  /** Tier 1 / file .riv — logo góc gallery thumb. */
  embedProvider: EmbedProviderId | null;
  coverId: string | null;
  coverSrc: string | null;
  videoProcessing: boolean;
  /** MP4 Bunny — gallery hiển thị frame đầu khi không có thumbnail. */
  videoPreviewSrc: string | null;
  videoCanvasRatio: VideoCanvasRatio | null;
  videoOrientation: VideoOrientation | null;
};

/**
 * Quyết định bài có lên grid không + thumb nào.
 * Trả `null` khi ẩn (text thuần, album/article không có ảnh). Video Bunny luôn lên grid.
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
  const embedProvider = resolveGalleryEmbedProvider(blocks);
  const mediaKind: GalleryMediaKind = embedProvider
    ? "embed"
    : postDisplayKindToGalleryMediaKind(resolution.kind);

  const processingMeta = extractVideoProcessingMeta(blocks);
  const videoProcessing =
    resolution.kind === "bunny_video" && processingMeta?.processing === true;

  if (resolution.kind === "bunny_video") {
    const bunnyThumb = resolveBunnyVideoThumbnailFromBlocks(blocks);
    const videoPreviewSrc = resolveBunnyVideoPreviewMp4FromBlocks(blocks);
    const customCoverOk =
      Boolean(coverTrimmed && isPersistedImageSeed(coverTrimmed));
    return {
      mediaKind: "video",
      embedProvider: null,
      coverId: coverTrimmed,
      coverSrc: customCoverOk ? null : bunnyThumb,
      videoProcessing,
      videoPreviewSrc,
      videoCanvasRatio: resolution.videoCanvasRatio,
      videoOrientation: resolution.videoOrientation,
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

  if (!thumbId || !isPersistedImageSeed(thumbId)) {
    /* Bài viết dài có video Bunny ở đầu — vẫn lên lưới bằng poster khi chưa có ảnh/cover. */
    if (
      resolution.gridThumbSource === "video_poster" &&
      isSingleBunnyUploadPost(blocks)
    ) {
      const bunnyThumb = resolveBunnyVideoThumbnailFromBlocks(blocks);
      const videoPreviewSrc = resolveBunnyVideoPreviewMp4FromBlocks(blocks);
      if (bunnyThumb || videoPreviewSrc) {
        return {
          mediaKind: "article",
          embedProvider: null,
          coverId: coverTrimmed,
          coverSrc: bunnyThumb,
          videoProcessing: processingMeta?.processing === true,
          videoPreviewSrc,
          videoCanvasRatio: extractVideoCanvasRatio(blocks),
          videoOrientation:
            videoOrientationFromCanvasRatio(
              extractVideoCanvasRatio(blocks) ?? "16:9",
            ),
        };
      }
    }
    /* Nhúng không cover CF — ưu tiên thumb provider (YouTube / đã lưu OG), rồi logo. */
    if (embedProvider) {
      const autoThumb = resolveEmbedGalleryThumbnailSrc(blocks);
      if (autoThumb) {
        return {
          mediaKind: "embed",
          embedProvider,
          coverId: null,
          coverSrc: autoThumb,
          videoProcessing: false,
          videoPreviewSrc: null,
          videoCanvasRatio: null,
          videoOrientation: null,
        };
      }
      const logo = embedPlatformLogoSrc(embedProvider);
      if (logo) {
        return {
          mediaKind: "embed",
          embedProvider,
          coverId: null,
          coverSrc: logo,
          videoProcessing: false,
          videoPreviewSrc: null,
          videoCanvasRatio: null,
          videoOrientation: null,
        };
      }
    }
    return null;
  }

  return {
    mediaKind,
    embedProvider,
    coverId: thumbId,
    coverSrc: null,
    videoProcessing: false,
    videoPreviewSrc: null,
    videoCanvasRatio: null,
    videoOrientation: null,
  };
}
