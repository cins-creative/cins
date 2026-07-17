import { isEditorEmptyImageSeed } from "@/lib/editor/editor-stock-image-seeds";
import { classifyEmbedUrl } from "@/lib/editor/embed-providers";
import { resolveEmbedGalleryThumbnailSrc } from "@/lib/editor/embed-thumbnail";
import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";
import type { Block as ServerBlock } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import {
  inferComposePreviewKind,
  type ComposePreviewKind,
} from "@/lib/journey/compose-preview-kind";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
} from "@/lib/journey/image-grid";
import {
  DEFAULT_ARTICLE_POST_TITLE,
  deriveMediaPostTitle,
  detectMediaPostKind,
  galleryItemExcerptLine,
  isMediaFallbackTitle,
} from "@/lib/journey/post-media";
import type { GalleryMediaKind } from "@/lib/journey/post-block-helpers";
import {
  findCoverThumbMeta,
  type CoverThumbMeta,
} from "@/lib/journey/cover-thumb";
import {
  shouldShowCoverOnPostCard,
} from "@/lib/journey/post-content-kind";
import { isPersistedImageSeed, isTemporaryImageRef } from "@/lib/truong/image-ref";

export type ComposePreviewDraft = {
  title: string;
  moTa: string;
  coverSeed: string | null;
  /** Block dạng server — giữ blob/data để xem trước khi upload xong. */
  blocks: ServerBlock[];
  /**
   * Cờ «Hiển thị thumbnail trong bài viết» — ưu tiên hơn flag trong blocks
   * (khi chưa có block thì flag chưa được ghi).
   */
  showCoverInPost?: boolean;
  /** Tỉ lệ + điểm neo thumbnail — ưu tiên hơn flag trong blocks. */
  coverThumb?: CoverThumbMeta | null;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  ownerSlug: string;
  /**
   * Video Bunny đang soạn — bổ sung URL / id vào embed trống để Journey preview
   * ra `jcard--video` thay vì article-peek chữ sai.
   */
  bunnyVideo?: {
    embedUrl?: string | null;
    bunnyVideoId?: string | null;
    processing?: boolean;
    videoCanvasRatio?: string | null;
  } | null;
};

export type ComposePreviewMedia = {
  src: string;
  isVideo?: boolean;
  width?: number;
  height?: number;
};

export type ComposePreviewSnapshot = {
  kind: ComposePreviewKind;
  title: string;
  body: string | null;
  /** Block đang soạn — render thân card Journey giống timeline. */
  blocks: ServerBlock[];
  /** Thumbnail Gallery / Masonry — luôn ưu tiên cover. */
  thumbSrc: string | null;
  thumbWidth?: number;
  thumbHeight?: number;
  /**
   * Gallery đang dùng ảnh/video trong nội dung vì user chưa chọn thumbnail.
   * Preview hiện dòng nhắc «Thiếu thumbnail…».
   */
  thumbAutoFromContent: boolean;
  /**
   * Media cover trên card Journey — tôn trọng `showCoverInPost`.
   * Album ảnh trong blocks vẫn qua `photoGrid` khi tắt cover.
   */
  journeyMediaSrc: string | null;
  journeyIsVideo: boolean;
  /**
   * Album ảnh từ block `imgs` (blob/CF) — giống `milestoneCardPhotoGrid`.
   * Cover thumbnail không nằm ở đây; đi qua `journeyMediaSrc`.
   */
  photoGrid: GridImage[] | null;
  media: ComposePreviewMedia[];
  isVideo: boolean;
  mediaKind: GalleryMediaKind | undefined;
  galleryLabel: string;
  galleryMeta: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerInitial: string;
  ownerSlug: string;
  /** Ngày giả lập trên card Journey. */
  displayDate: string;
  /** Cờ «Hiển thị thumbnail trong bài viết». */
  showCoverInPost: boolean;
  /** Tỉ lệ + điểm neo cho Gallery / bài dài. Masonry bỏ qua. */
  coverThumb: CoverThumbMeta | null;
};

function seedToUrl(seed: string | null | undefined): string | null {
  const trimmed = seed?.trim();
  if (!trimmed || isEditorEmptyImageSeed(trimmed)) return null;
  const url = resolveImageSeedUrl(trimmed, 900, 600);
  return url || null;
}

function firstImgSeedFromBlocks(blocks: ServerBlock[]): string | null {
  for (const block of blocks) {
    if (block.loai !== "imgs") continue;
    const imgs = block.config?.imgs;
    if (!Array.isArray(imgs)) continue;
    for (const raw of imgs) {
      if (typeof raw !== "string") continue;
      const url = seedToUrl(raw);
      if (url) return raw.trim();
    }
  }
  return null;
}

function collectImgUrls(blocks: ServerBlock[], max = 3): ComposePreviewMedia[] {
  const out: ComposePreviewMedia[] = [];
  for (const block of blocks) {
    if (block.loai !== "imgs") continue;
    const imgs = block.config?.imgs;
    if (!Array.isArray(imgs)) continue;
    for (const raw of imgs) {
      if (typeof raw !== "string") continue;
      const url = seedToUrl(raw);
      if (!url) continue;
      out.push({
        src: url,
        width:
          typeof block.config?.width === "number"
            ? block.config.width
            : undefined,
        height:
          typeof block.config?.height === "number"
            ? block.config.height
            : undefined,
      });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/**
 * Album từ block `imgs` — giữ blob/data như compose; id CF khi đã persist.
 * Không gồm cover thumbnail (cover đi `journeyMediaSrc` / `preview`).
 */
function photoGridFromBlocks(blocks: ServerBlock[]): GridImage[] | null {
  const out: GridImage[] = [];
  for (const block of blocks) {
    if (block.loai !== "imgs" || block.config?.layout === "mosaic") continue;
    const cfg = block.config || {};
    const raw = Array.isArray(cfg.imgs) ? cfg.imgs : [];
    const width =
      typeof cfg.width === "number" && cfg.width > 0
        ? Math.round(cfg.width)
        : GRID_IMAGE_DEFAULT_WIDTH;
    const height =
      typeof cfg.height === "number" && cfg.height > 0
        ? Math.round(cfg.height)
        : GRID_IMAGE_DEFAULT_HEIGHT;

    for (const seed of raw) {
      if (typeof seed !== "string") continue;
      const trimmed = seed.trim();
      if (!trimmed || isEditorEmptyImageSeed(trimmed)) continue;
      if (isTemporaryImageRef(trimmed)) {
        out.push({
          id: `compose-blob-${out.length}`,
          width,
          height,
          previewSrc: trimmed,
        });
        continue;
      }
      const url = seedToUrl(trimmed);
      if (!url) continue;
      if (isPersistedImageSeed(trimmed)) {
        out.push({ id: trimmed, width, height });
      } else {
        out.push({
          id: `compose-img-${out.length}`,
          width,
          height,
          previewSrc: url,
        });
      }
    }
  }
  return out.length > 0 ? out : null;
}

function resolveThumb(
  coverSeed: string | null,
  blocks: ServerBlock[],
): { src: string | null; width?: number; height?: number; isVideo: boolean } {
  const coverUrl = seedToUrl(coverSeed);
  if (coverUrl) {
    return { src: coverUrl, isVideo: false };
  }

  const firstImg = firstImgSeedFromBlocks(blocks);
  if (firstImg) {
    return { src: seedToUrl(firstImg), isVideo: false };
  }

  const embedThumb = resolveEmbedGalleryThumbnailSrc(blocks);
  if (embedThumb) {
    const embed = blocks.find((b) => b.loai === "embed");
    const url =
      typeof embed?.config?.url === "string" ? embed.config.url.trim() : "";
    const bunny = url ? classifyBunnyVideoUrl(url) : null;
    const provider = url ? classifyEmbedUrl(url)?.provider : null;
    const isVideo =
      Boolean(bunny) ||
      provider === "youtube" ||
      provider === "vimeo";
    return {
      src: embedThumb,
      isVideo,
    };
  }

  const embed = blocks.find((b) => b.loai === "embed");
  const url =
    typeof embed?.config?.url === "string" ? embed.config.url.trim() : "";
  if (url && classifyBunnyVideoUrl(url)) {
    return { src: null, isVideo: true };
  }

  return { src: null, isVideo: false };
}

function resolveDisplayTitle(
  title: string,
  moTa: string,
  kind: ComposePreviewKind,
  blocks: ServerBlock[],
): string {
  const trimmed = title.trim();
  const mediaKind = detectMediaPostKind(blocks);
  if (mediaKind && isMediaFallbackTitle(trimmed, mediaKind)) {
    return deriveMediaPostTitle(moTa, mediaKind);
  }
  if (!trimmed) {
    if (kind === "photo") return "Ảnh";
    if (kind === "video") return "Đoạn phim";
    if (kind === "text") return "Bài viết";
    return DEFAULT_ARTICLE_POST_TITLE;
  }
  return trimmed;
}

function ownerInitialFromName(name: string, slug: string): string {
  const src = name.trim() || slug.trim();
  if (!src) return "?";
  return src.charAt(0).toUpperCase();
}

function todayDisplayDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function inferGalleryMediaKind(
  kind: ComposePreviewKind,
  blocks: ServerBlock[],
  isVideo: boolean,
): GalleryMediaKind | undefined {
  if (kind === "text") return undefined;
  if (isVideo || kind === "video") return "video";
  if (blocks.some((b) => b.loai === "embed")) return "embed";
  if (kind === "photo" || blocks.some((b) => b.loai === "imgs")) return "photo";
  return "article";
}

function enrichBunnyVideoPreviewBlocks(
  blocks: ServerBlock[],
  bunnyVideo: ComposePreviewDraft["bunnyVideo"],
): ServerBlock[] {
  if (!bunnyVideo) return blocks;
  const embedUrl = bunnyVideo.embedUrl?.trim() || "";
  const bunnyVideoId = bunnyVideo.bunnyVideoId?.trim() || "";
  if (!embedUrl && !bunnyVideoId) return blocks;

  let touched = false;
  const next = blocks.map((block) => {
    if (block.loai !== "embed" || touched) return block;
    const cfg = block.config ?? {};
    const existingUrl =
      (typeof cfg.url === "string" && cfg.url.trim()) ||
      (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) ||
      "";
    const existingId =
      typeof cfg.bunnyVideoId === "string" ? cfg.bunnyVideoId.trim() : "";
    if (existingUrl && classifyBunnyVideoUrl(existingUrl)) {
      touched = true;
      return block;
    }
    if (existingId && !embedUrl && !bunnyVideoId) {
      touched = true;
      return block;
    }
    touched = true;
    return {
      ...block,
      config: {
        ...cfg,
        ...(embedUrl ? { url: embedUrl } : {}),
        ...(bunnyVideoId ? { bunnyVideoId } : {}),
        ...(bunnyVideo.processing ? { videoProcessing: true } : {}),
        ...(bunnyVideo.videoCanvasRatio
          ? { videoCanvasRatio: bunnyVideo.videoCanvasRatio }
          : {}),
      },
    };
  });
  return touched ? next : blocks;
}

/**
 * Chuyển draft đang soạn → snapshot xem trước (Journey / Gallery / Masonry).
 * Giữ blob:/data: để preview tức thì khi upload chưa xong.
 */
export function buildComposePreviewSnapshot(
  draft: ComposePreviewDraft,
): ComposePreviewSnapshot {
  const blocks = enrichBunnyVideoPreviewBlocks(draft.blocks, draft.bunnyVideo);
  const showCoverInPost =
    typeof draft.showCoverInPost === "boolean"
      ? draft.showCoverInPost
      : shouldShowCoverOnPostCard(blocks);
  const coverThumb =
    draft.coverThumb === undefined
      ? findCoverThumbMeta(blocks)
      : draft.coverThumb;

  let kind = inferComposePreviewKind(blocks, draft.coverSeed, draft.moTa);
  /* Đang soạn video Bunny nhưng block embed còn trống / chưa sync URL. */
  if (
    draft.bunnyVideo &&
    (draft.bunnyVideo.embedUrl?.trim() ||
      draft.bunnyVideo.bunnyVideoId?.trim()) &&
    kind !== "article" &&
    kind !== "photo"
  ) {
    kind = "video";
  }
  if (
    draft.bunnyVideo &&
    !draft.bunnyVideo.embedUrl?.trim() &&
    !draft.bunnyVideo.bunnyVideoId?.trim() &&
    kind === "text" &&
    !blocks.some((b) => b.loai === "imgs" || b.loai === "h2" || b.loai === "h3")
  ) {
    /* Upload mới bắt đầu — vẫn hiện card video (processing), không article-peek. */
    kind = "video";
  }
  const thumb = resolveThumb(draft.coverSeed, blocks);
  const imgMedia = collectImgUrls(blocks, 3);
  const coverUrl = seedToUrl(draft.coverSeed);
  const photoGrid = kind === "photo" ? photoGridFromBlocks(blocks) : null;

  /* Gallery: luôn ưu tiên cover (kể cả khi tắt hiện trong Journey). */
  const media: ComposePreviewMedia[] =
    thumb.src && !imgMedia.some((m) => m.src === thumb.src)
      ? [{ src: thumb.src, isVideo: thumb.isVideo }, ...imgMedia]
      : imgMedia.length > 0
        ? imgMedia
        : thumb.src
          ? [{ src: thumb.src, isVideo: thumb.isVideo }]
          : [];

  /* Journey card: cover chỉ khi bật «Hiển thị thumbnail…».
   * Tắt → ẩn cover; album ảnh vẫn qua photoGrid; video lấy poster embed. */
  let journeyMediaSrc: string | null = null;
  let journeyIsVideo = false;
  if (showCoverInPost) {
    if (imgMedia.length > 0 && kind === "photo") {
      journeyMediaSrc = coverUrl ?? imgMedia[0]!.src;
    } else if (coverUrl) {
      journeyMediaSrc = coverUrl;
    } else if (kind === "video" || thumb.isVideo) {
      journeyIsVideo = true;
      journeyMediaSrc = thumb.src;
      if (!journeyMediaSrc) {
        const embedOnly = resolveThumb(null, blocks);
        journeyMediaSrc = embedOnly.src;
      }
    } else if (thumb.src) {
      journeyMediaSrc = thumb.src;
      journeyIsVideo = thumb.isVideo;
    }
  } else if (kind === "video" || thumb.isVideo) {
    journeyIsVideo = true;
    journeyMediaSrc = resolveThumb(null, blocks).src;
  }

  const title = resolveDisplayTitle(draft.title, draft.moTa, kind, blocks);
  const body = draft.moTa.trim() || null;
  const mediaKind = inferGalleryMediaKind(kind, blocks, thumb.isVideo);
  const resolvedThumbSrc = thumb.src ?? media[0]?.src ?? null;
  const thumbAutoFromContent = !coverUrl && Boolean(resolvedThumbSrc);

  return {
    kind,
    title,
    body,
    blocks,
    thumbSrc: resolvedThumbSrc,
    thumbWidth: thumb.width ?? media[0]?.width,
    thumbHeight: thumb.height ?? media[0]?.height,
    thumbAutoFromContent,
    journeyMediaSrc,
    journeyIsVideo,
    photoGrid,
    media,
    isVideo: thumb.isVideo || kind === "video",
    mediaKind,
    galleryLabel: title,
    galleryMeta: galleryItemExcerptLine(body, body, blocks),
    ownerName: draft.ownerName.trim() || draft.ownerSlug,
    ownerAvatarUrl: draft.ownerAvatarUrl?.trim() || null,
    ownerInitial: ownerInitialFromName(draft.ownerName, draft.ownerSlug),
    ownerSlug: draft.ownerSlug,
    displayDate: todayDisplayDate(),
    showCoverInPost,
    coverThumb,
  };
}

/**
 * Serialize block editor → server shape nhưng GIỮ blob/data (khác publish).
 */
export function toPreviewServerBlocks(
  blocks: ReadonlyArray<{
    id: string;
    t: string;
    text?: string;
    imgs?: string[];
    layout?: string;
    rounded?: boolean;
    gap?: number;
    cap?: string;
    width?: number;
    height?: number;
    albumGridCell?: boolean;
    albumLayout?: string;
    embedUrl?: string;
    videoCanvasRatio?: string;
    colors?: string[];
    size?: string;
    dividerLen?: number;
    dividerThick?: string;
  }>,
): ServerBlock[] {
  return blocks.map((b, i) => {
    let loai: ServerBlock["loai"] = "body";
    let config: Record<string, unknown> = {};

    switch (b.t) {
      case "h2":
        loai = "h2";
        config = { html: b.text || "" };
        break;
      case "h3":
        loai = "h3";
        config = { html: b.text || "" };
        break;
      case "body":
        loai = "body";
        config = { html: b.text || "" };
        break;
      case "quote":
        loai = "quote";
        config = { html: b.text || "" };
        break;
      case "imgs":
        loai = "imgs";
        config = {
          layout: b.layout || "full",
          rounded: !!b.rounded,
          gap: b.gap ?? 2,
          cap: b.cap || "",
          imgs: (b.imgs || []).filter(
            (s) => typeof s === "string" && s.trim() && !isEditorEmptyImageSeed(s),
          ),
          ...(typeof b.width === "number" ? { width: b.width } : {}),
          ...(typeof b.height === "number" ? { height: b.height } : {}),
          ...(b.albumGridCell === true
            ? { albumGridCell: true }
            : b.albumGridCell === false
              ? { albumGridCell: false }
              : {}),
          ...(b.albumGridCell === true && b.albumLayout
            ? { albumLayout: b.albumLayout }
            : {}),
        };
        break;
      case "embed":
        loai = "embed";
        config = {
          url: (b.embedUrl || "").trim(),
          ...(b.videoCanvasRatio
            ? { videoCanvasRatio: b.videoCanvasRatio }
            : {}),
        };
        break;
      case "palette":
        loai = "palette";
        config = { colors: b.colors || [] };
        break;
      case "spacer":
        loai = "spacer";
        config = { size: b.size || "m" };
        break;
      case "divider":
        loai = "divider";
        config = {
          len: b.dividerLen ?? 8,
          thick: b.dividerThick || "med",
        };
        break;
      default:
        loai = "body";
        config = { html: "" };
    }

    return { id: b.id, loai, thu_tu: i, config };
  });
}
