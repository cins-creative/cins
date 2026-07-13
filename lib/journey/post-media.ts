import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import {
  buildEmbedIframeSrc,
  classifyEmbedUrl,
  type EmbedProviderId,
  type Tier1EmbedPlatformId,
} from "@/lib/editor/embed-providers";
import { isLottieAssetEmbedUrl } from "@/lib/editor/lottie-asset-url";
import { isRiveAssetEmbedUrl } from "@/lib/editor/rive-asset-url";
import type { ComposeIntent } from "@/lib/journey/compose-types";
import {
  blocksAreMediaCaptionOnly,
  blocksArePlainTextOnly,
  extractAllImageIds,
  extractPhotoImageIds,
  hasArticleLayoutBlocks,
  type GalleryMediaKind,
} from "@/lib/journey/post-block-helpers";
import {
  hasGalleryEmbedContent,
  resolvePostDisplayKind,
} from "@/lib/journey/post-content-kind";
import { extractVideoCanvasRatio } from "@/lib/journey/video-canvas-ratio";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";
import {
  chiChuNeedsCollapse,
  restoreChiChuPlainLineBreaks,
} from "@/lib/journey/plain-text-bg";
import type { BaiDangLoai } from "@/lib/truong/bai-dang";

export type MediaPostKind = "photo" | "video";

/** Loại nội dung timeline card — bài viết / album ảnh / video. */
export type MilestoneContentKind = "article" | "photo" | "video";

export function milestoneContentKind(
  blocks: ReadonlyArray<Block> | null | undefined,
): MilestoneContentKind {
  const kind = detectMediaPostKind(blocks);
  if (kind === "photo") return "photo";
  if (kind === "video") return "video";
  return "article";
}

/** Bài chỉ gồm caption (tuỳ chọn) + ảnh hoặc video — không phải bài viết dài. */
export function detectMediaPostKind(
  blocks: ReadonlyArray<Block> | null | undefined,
): MediaPostKind | null {
  if (!blocks || blocks.length === 0) return null;

  let hasImgs = false;
  let hasEmbed = false;

  for (const block of blocks) {
    if (block.loai === "body") continue;
    if (block.loai === "imgs") {
      hasImgs = true;
      continue;
    }
    if (block.loai === "embed") {
      hasEmbed = true;
      continue;
    }
    return null;
  }

  if (hasImgs && !hasEmbed) return "photo";
  if (hasEmbed && !hasImgs) return "video";
  return null;
}

/** Nền tảng Tier 1 (YouTube, Figma, …) — không gồm Bunny Stream / Behance. */
export function detectExternalEmbedPlatform(
  blocks: ReadonlyArray<Block> | null | undefined,
): Tier1EmbedPlatformId | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url = blockEmbedConfigUrl(block);
    if (!url) continue;
    const classified = classifyEmbedUrl(url);
    if (!classified || classified.provider === "behance" || classified.provider === "framer") continue;
    if (classified.provider === "rive-file" || classified.provider === "lottie-file") continue;
    if (buildEmbedIframeSrc(classified) === null) continue;
    return classified.provider as Tier1EmbedPlatformId;
  }
  return null;
}

/** URL file .riv trên R2 — block embed đã lưu. */
export function detectRiveFileEmbedUrl(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url = blockEmbedConfigUrl(block);
    if (!url) continue;
    const classified = classifyEmbedUrl(url);
    if (classified?.provider === "rive-file") return classified.url;
    if (isRiveAssetEmbedUrl(url)) return url.trim();
  }
  return null;
}

/** URL file .lottie trên R2 — block embed đã lưu. */
export function detectLottieFileEmbedUrl(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url = blockEmbedConfigUrl(block);
    if (!url) continue;
    const classified = classifyEmbedUrl(url);
    if (classified?.provider === "lottie-file") return classified.url;
    if (isLottieAssetEmbedUrl(url)) return url.trim();
  }
  return null;
}

export type EditEmbedComposeMeta = {
  embedPlatform: Tier1EmbedPlatformId;
  fileSource?: "url" | "file";
  /** @deprecated dùng fileSource */
  riveSource?: "url" | "file";
};

/** Meta embed khi mở sửa bài — đồng bộ layout compose nhúng. */
export function resolveEditEmbedComposeMeta(
  blocks: ReadonlyArray<Block> | null | undefined,
): EditEmbedComposeMeta | null {
  if (detectRiveFileEmbedUrl(blocks)) {
    return { embedPlatform: "rive", fileSource: "file", riveSource: "file" };
  }
  if (detectLottieFileEmbedUrl(blocks)) {
    return { embedPlatform: "lottie", fileSource: "file", riveSource: "file" };
  }
  const platform = detectExternalEmbedPlatform(blocks);
  if (platform) {
    return { embedPlatform: platform, fileSource: "url", riveSource: "url" };
  }
  return null;
}

/** Intent overlay edit — video/album giữ luồng riêng; bài viết dài mở editor đầy đủ. */
export function resolveEditComposeIntent(
  blocks: ReadonlyArray<Block> | null | undefined,
  moTa?: string | null,
): ComposeIntent {
  if (resolveEditEmbedComposeMeta(blocks)) return "embed";
  const mediaKind = detectMediaPostKind(blocks);
  if (mediaKind === "video") return "video";
  if (mediaKind === "photo") return "photo";
  const kind = resolvePostDisplayKind({
    blocks: blocks ?? [],
    moTa: moTa ?? null,
  }).kind;
  if (kind === "article") return "full";
  return "minimal";
}

/** Chỉ caption trong blocks — không có album / heading / embed / … */
export function blocksAreCaptionOnly(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  if (!blocks?.length) return true;
  return blocks.every((b) => b.loai === "body" || b.loai === "spacer");
}

export function isMediaPost(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  return detectMediaPostKind(blocks) !== null;
}

/** Split layout: caption/blocks sang rail — album ảnh, video, bài viết dài. */
export function shouldMovePostTextToSplitRail(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  return Boolean(blocks?.length);
}

/** Tách blocks cho layout 2 cột: rail (caption media) vs cột trái (media / nội dung bài). */
export function partitionBlocksForSplitRail(blocks: ReadonlyArray<Block>): {
  railBlocks: Block[];
  mediaBlocks: Block[];
} {
  const kind = detectMediaPostKind(blocks);
  if (kind === "photo" || kind === "video") {
    return {
      railBlocks: blocks.filter((b) => b.loai === "body"),
      mediaBlocks: blocks.filter((b) => b.loai !== "body"),
    };
  }
  return { railBlocks: [], mediaBlocks: [...blocks] };
}

export function extractBodyCaption(
  blocks: ReadonlyArray<Block> | null | undefined,
): string {
  if (!blocks) return "";
  const body = blocks.find((b) => b.loai === "body");
  const html = body?.config?.html;
  return typeof html === "string" ? html : "";
}

export const DEFAULT_ARTICLE_POST_TITLE = "Bài viết";

export function defaultMediaPostTitle(kind: MediaPostKind): string {
  return kind === "video" ? "Đoạn phim" : "Ảnh";
}

export function deriveMediaPostTitle(
  caption: string,
  kind: MediaPostKind,
): string {
  const line = caption.trim().split("\n")[0]?.trim();
  if (line) return line.slice(0, 120);
  return defaultMediaPostTitle(kind);
}

/** Tiêu đề trong form compose — ẩn fallback DB auto. */
export function initialMediaComposeTitle(
  tieuDe: string | null | undefined,
  kind: MediaPostKind,
): string {
  const trimmed = (tieuDe ?? "").trim();
  if (!trimmed || isMediaFallbackTitle(trimmed, kind)) return "";
  return trimmed;
}

export function resolveMediaPostTitle(
  titleInput: string,
  _caption: string,
  kind: MediaPostKind,
): string {
  const trimmedTitle = titleInput.trim();
  if (trimmedTitle) return trimmedTitle.slice(0, 120);
  return defaultMediaPostTitle(kind);
}

const MEDIA_FALLBACK_TITLES: Record<MediaPostKind, string> = {
  photo: "Ảnh",
  video: "Đoạn phim",
};

const LEGACY_MEDIA_FALLBACK_TITLES: Record<MediaPostKind, string> = {
  photo: "Ảnh mới",
  video: "Video mới",
};

/** Tiêu đề DB auto — không phải H1 do user nhập. */
export function isMediaFallbackTitle(
  title: string,
  kind: MediaPostKind,
): boolean {
  const trimmed = title.trim();
  return (
    trimmed === MEDIA_FALLBACK_TITLES[kind] ||
    trimmed === LEGACY_MEDIA_FALLBACK_TITLES[kind]
  );
}

/** Nhãn hiển thị UI khi tiêu đề là fallback media (vd. gallery đồ án). */
export function displayMediaPostTitle(title: string): string {
  const trimmed = title.trim();
  if (
    trimmed === MEDIA_FALLBACK_TITLES.photo ||
    trimmed === LEGACY_MEDIA_FALLBACK_TITLES.photo
  ) {
    return "Ảnh";
  }
  return title;
}

export function isPostPermalinkHref(href: string | undefined): href is string {
  return Boolean(href && /\/p\/[^/?#]+/.test(href));
}

export type { GalleryMediaKind };
export {
  blocksAreMediaCaptionOnly,
  blocksArePlainTextOnly,
  extractAllImageIds,
  extractPhotoImageIds,
  hasArticleLayoutBlocks,
} from "@/lib/journey/post-block-helpers";
export {
  hasGalleryEmbedContent,
  resolveGalleryEmbedProvider,
} from "@/lib/journey/post-content-kind";

export function galleryMediaKindFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): GalleryMediaKind {
  if (hasGalleryEmbedContent(blocks)) return "embed";
  const kind = detectMediaPostKind(blocks);
  if (kind === "photo") return "photo";
  if (kind === "video") return "video";
  return "article";
}

/** Poster/thumbnail gallery — Bunny Stream, YouTube, v.v. */
export function isGalleryVideoCoverSrc(
  src: string | null | undefined,
): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (classifyBunnyVideoUrl(trimmed)) return true;
  if (/\.b-cdn\.net\/[^/]+\/thumbnail\.jpg/i.test(trimmed)) return true;
  try {
    const host = new URL(trimmed).hostname.replace(/^www\./, "");
    return /^(i\.)?ytimg\.com$/i.test(host) || host === "img.youtube.com";
  } catch {
    return false;
  }
}

export type GalleryMediaFilter = "all" | GalleryMediaKind;

export const GALLERY_MEDIA_FILTER_OPTIONS: ReadonlyArray<{
  id: GalleryMediaFilter;
  label: string;
}> = [
  { id: "all", label: "Tất cả" },
  { id: "article", label: "Bài viết" },
  { id: "photo", label: "Album ảnh" },
  { id: "video", label: "Video" },
  { id: "embed", label: "File nhúng" },
];

export type GalleryMediaFilterCounts = Record<GalleryMediaFilter, number>;

export function computeGalleryMediaFilterCounts(
  items: ReadonlyArray<{ mediaKind?: GalleryMediaKind }>,
): GalleryMediaFilterCounts {
  const counts: GalleryMediaFilterCounts = {
    all: items.length,
    article: 0,
    photo: 0,
    video: 0,
    embed: 0,
  };
  for (const item of items) {
    const kind = item.mediaKind ?? "article";
    counts[kind] += 1;
  }
  return counts;
}

export function galleryMediaFilterLabel(filter: GalleryMediaFilter): string {
  return (
    GALLERY_MEDIA_FILTER_OPTIONS.find((o) => o.id === filter)?.label ?? "Tất cả"
  );
}

/** Nhãn trên nút dropdown — khi chưa chọn loại cụ thể hiện «Loại nội dung». */
export function galleryMediaFilterButtonLabel(filter: GalleryMediaFilter): string {
  if (filter === "all") return "Loại nội dung";
  return galleryMediaFilterLabel(filter);
}

export function matchesGalleryMediaFilter(
  mediaKind: GalleryMediaKind | undefined,
  filter: GalleryMediaFilter,
): boolean {
  if (filter === "all") return true;
  return (mediaKind ?? "article") === filter;
}

/** Tiêu đề DB auto bài viết — không phải H1 do user nhập. */
export function isArticleFallbackTitle(title: string): boolean {
  const trimmed = title.trim();
  return !trimmed || trimmed === DEFAULT_ARTICLE_POST_TITLE;
}

function htmlFragmentToPlainText(html: string): string {
  const trimmed = html.replace(/\r\n/g, "\n");
  if (!/<[a-z][\s>]/i.test(trimmed)) {
    return trimmed.trim();
  }
  return trimmed
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
    .replace(/<(?:p|div|h[1-6]|li|blockquote|tr)(?:\s[^>]*)?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compactPlainText(text: string): string {
  return text.replace(/\s+/g, "");
}

/** Ưu tiên bản giữ nhiều xuống dòng hơn (mô tả editor thường đúng hơn block html). */
function preferRicherPlainText(a: string, b: string): string {
  const aBreaks = (a.match(/\n/g) ?? []).length;
  const bBreaks = (b.match(/\n/g) ?? []).length;
  if (aBreaks !== bBreaks) return bBreaks > aBreaks ? b : a;
  return a.length >= b.length ? a : b;
}

/** Tiêu đề DB copy từ dòng đầu nội dung (compose không nhập title). */
function titleMatchesAutoDerivedContent(
  title: string,
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return true;

  const fromMoTa = body?.trim();
  if (fromMoTa) {
    const moTaPlain = htmlFragmentToPlainText(fromMoTa);
    const firstMoTa = moTaPlain.split("\n\n")[0]?.trim() ?? moTaPlain.trim();
    if (
      trimmedTitle === firstMoTa.slice(0, 120) ||
      trimmedTitle === moTaPlain.slice(0, 120)
    ) {
      return true;
    }
  }

  if (blocks?.length) {
    const parts: string[] = [];
    for (const block of blocks) {
      if (block.loai !== "body") continue;
      const html = block.config?.html;
      if (typeof html !== "string") continue;
      const plain = htmlFragmentToPlainText(html);
      if (plain) parts.push(plain);
    }
    if (parts.length) {
      const panelPlain = parts.join("\n\n").trim();
      const firstLine = panelPlain.split("\n\n")[0]?.trim() ?? panelPlain;
      if (
        trimmedTitle === firstLine.slice(0, 120) ||
        trimmedTitle === panelPlain.slice(0, 120)
      ) {
        return true;
      }
    }
  }

  return false;
}

/** Card timeline: chỉ hiện tiêu đề khi user thật sự nhập (không fallback / không copy body). */
export function shouldShowMilestoneCardTitle(
  title: string,
  blocks: ReadonlyArray<Block> | null | undefined,
  body?: string | null,
): boolean {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || isArticleFallbackTitle(trimmedTitle)) return false;

  const kind = detectMediaPostKind(blocks);
  if (kind && isMediaFallbackTitle(trimmedTitle, kind)) return false;

  if (titleMatchesAutoDerivedContent(trimmedTitle, body, blocks)) return false;

  return true;
}

/** Card timeline có gì để render trong `.jcard-body` (ngoài datebar). */
export function milestoneCardHasVisibleBody(
  title: string,
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview = false,
): boolean {
  if (hasCoverPreview) return true;
  if (shouldShowMilestoneCardTitle(title, blocks, body)) return true;
  if (milestoneCardCaptionPlain(body, blocks)) return true;
  if (plainTextCardPlain(body, blocks)) return true;
  if (extractAllImageIds(blocks).length > 0) return true;
  if (detectMediaPostKind(blocks) === "video") {
    const url = blocks?.find((b) => b.loai === "embed")?.config?.url;
    if (typeof url === "string" && url.trim()) return true;
  }
  return false;
}

/** Nhãn khi milestone/post tồn tại nhưng không có preview trên card. */
export function milestoneCardEmptyFallback(
  blocks: ReadonlyArray<Block> | null | undefined,
  hasLinkedPost: boolean,
): string {
  if (blocks?.some((b) => b.loai === "imgs")) {
    return "Album ảnh chưa có ảnh hiển thị — mở bài viết hoặc đăng lại nội dung.";
  }
  if (hasLinkedPost) {
    return "Bài viết chưa có nội dung hiển thị trên timeline.";
  }
  return "Mốc này chưa có nội dung.";
}

/** Tiêu đề trên card chỉ chữ — gồm cả tieu_de auto từ dòng đầu nội dung. */
export function shouldShowChiChuTitle(
  title: string,
  blocks: ReadonlyArray<Block> | null | undefined,
  body?: string | null,
): boolean {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || isArticleFallbackTitle(trimmedTitle)) return false;

  const kind = detectMediaPostKind(blocks);
  if (kind && isMediaFallbackTitle(trimmedTitle, kind)) return false;

  if (titleMatchesAutoDerivedContent(trimmedTitle, body, blocks)) return false;

  return true;
}

/** Nội dung card chỉ chữ — bỏ đoạn trùng tiêu đề khi hiện tiêu đề riêng. */
export function chiChuBodyPlain(
  title: string,
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const plain = plainTextCardPlain(body, blocks);
  if (!plain) return null;

  let display = plain;
  if (shouldShowChiChuTitle(title, blocks, body)) {
    const trimmedTitle = title.trim();
    const parts = plain
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0 && parts[0] === trimmedTitle) {
      display = parts.slice(1).join("\n\n") || plain;
    } else if (trimmedTitle && plain.startsWith(trimmedTitle)) {
      display = plain.slice(trimmedTitle.length).replace(/^\s+/, "") || plain;
    }
  }

  const restored = restoreChiChuPlainLineBreaks(display);
  return restored || null;
}

/** Nhãn gallery grid — luôn có default theo loại nội dung. */
export function galleryItemLabel(
  tieuDe: string,
  mediaKind: GalleryMediaKind,
): string {
  const trimmed = tieuDe.trim();
  if (mediaKind === "photo") {
    if (!trimmed || isMediaFallbackTitle(trimmed, "photo")) {
      return MEDIA_FALLBACK_TITLES.photo;
    }
    return trimmed;
  }
  if (mediaKind === "video") {
    if (!trimmed || isMediaFallbackTitle(trimmed, "video")) {
      return MEDIA_FALLBACK_TITLES.video;
    }
    return trimmed;
  }
  if (mediaKind === "embed") {
    if (!trimmed || isArticleFallbackTitle(trimmed)) {
      return "File nhúng";
    }
    return trimmed;
  }
  if (isArticleFallbackTitle(trimmed)) {
    return DEFAULT_ARTICLE_POST_TITLE;
  }
  return trimmed;
}

export function milestoneCardCaption(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const fromBody = body?.trim();
  if (fromBody) return fromBody;
  const fromBlocks = extractBodyCaption(blocks).trim();
  return fromBlocks || null;
}

/** Dòng phụ gallery card — mô tả cột mốc / tác phẩm hoặc dòng đầu block text. */
export function galleryItemExcerptLine(
  milestoneMoTa: string | null | undefined,
  tacPhamMoTa: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string {
  const fromMilestone = milestoneMoTa?.trim();
  if (fromMilestone) {
    return fromMilestone.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  }

  const fromTacPham = tacPhamMoTa?.trim();
  if (fromTacPham) {
    return fromTacPham.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  }

  if (!blocks) return "";

  for (const block of blocks) {
    if (
      block.loai !== "body" &&
      block.loai !== "h2" &&
      block.loai !== "h3" &&
      block.loai !== "quote"
    ) {
      continue;
    }
    const html = block.config?.html;
    if (typeof html !== "string") continue;
    const plain = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
    const line = plain.split("\n").map((l) => l.trim()).find(Boolean);
    if (line) return line.slice(0, 200);
  }

  return "";
}

/** Caption hiển thị trên card timeline — bỏ HTML editor. */
export function milestoneCardCaptionPlain(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const raw = milestoneCardCaption(body, blocks);
  if (!raw) return null;
  const text = htmlFragmentToPlainText(raw);
  return text || null;
}

/** Nội dung chữ trên card — ưu tiên `mo_ta`/body (mô tả editor), blocks là nội dung dài. */
export function milestoneCardBodyForDisplay(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null | undefined {
  const fromBody = body?.trim();
  if (fromBody) return fromBody;
  if (blocks?.length) {
    const fromBlocks = plainTextCardPlain(body, blocks);
    if (fromBlocks) return fromBlocks;
  }
  return body;
}

function stripRepeatedTitlePrefix(caption: string, title: string): string {
  let rest = caption.trim();
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return rest;

  let changed = true;
  while (changed && rest) {
    changed = false;
    if (rest.startsWith(trimmedTitle)) {
      rest = rest.slice(trimmedTitle.length).replace(/^\s+/, "");
      changed = true;
      continue;
    }
    const paras = rest
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paras[0] === trimmedTitle) {
      rest = paras.slice(1).join("\n\n");
      changed = true;
    }
  }
  return rest;
}

/**
 * Caption card photo/video/article — ưu tiên blocks, bỏ đoạn trùng `title` khi
 * tiêu đề hiện riêng (cùng logic org `OrgBaiDangJourneyCard`).
 */
export function milestoneCardCaptionForDisplay(
  title: string,
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const displayBody = milestoneCardBodyForDisplay(body, blocks);
  const caption = milestoneCardCaptionPlain(displayBody, blocks);
  if (!caption) return null;
  if (!shouldShowMilestoneCardTitle(title, blocks, body)) return caption;
  const stripped = stripRepeatedTitlePrefix(caption, title);
  return stripped.trim() || null;
}

function plainTextFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  const parts: string[] = [];
  for (const block of blocks) {
    if (
      block.loai !== "body" &&
      block.loai !== "h2" &&
      block.loai !== "h3" &&
      block.loai !== "quote"
    ) {
      continue;
    }
    const html = block.config?.html;
    if (typeof html !== "string") continue;
    const plain = htmlFragmentToPlainText(html);
    if (plain) parts.push(plain);
  }
  return parts.length ? parts.join("\n\n") : null;
}

/** Gộp mô tả + block chữ — bỏ trùng khi block lặp lại mo_ta. */
function mergePlainTextMoTaAndBlocks(
  moTa: string | null,
  blocksText: string | null,
): string | null {
  if (moTa && blocksText) {
    if (blocksText === moTa) return moTa;
    if (blocksText.startsWith(moTa)) return blocksText;
    if (moTa.startsWith(blocksText)) return moTa;
    if (compactPlainText(moTa) === compactPlainText(blocksText)) {
      return preferRicherPlainText(moTa, blocksText);
    }
    return `${moTa}\n\n${blocksText}`;
  }
  return moTa ?? blocksText;
}

/** Nội dung đầy đủ card chỉ chữ — gồm mo_ta (mô tả) + block chữ bổ sung. */
export function plainTextCardPlain(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const moTaRaw = body?.trim() || null;
  const moTa = moTaRaw ? htmlFragmentToPlainText(moTaRaw) || null : null;
  const blocksText = plainTextFromBlocks(blocks);
  const merged = mergePlainTextMoTaAndBlocks(moTa, blocksText);
  if (merged) return merged;
  return milestoneCardCaptionPlain(body, blocks);
}

/** Blocks unfold timeline — bỏ nội dung đã hiện ở `.jcard-desc` trên card. */
export function blocksForArticleCardUnfold(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): Block[] {
  if (!blocks?.length) return [];

  const captionPlain = milestoneCardCaptionPlain(body, blocks)?.trim();
  if (!captionPlain) return [...blocks];

  const result: Block[] = [];
  let leadHandled = false;

  for (const block of blocks) {
    if (!leadHandled && block.loai === "body") {
      const html = block.config?.html;
      if (typeof html === "string") {
        const blockPlain = htmlFragmentToPlainText(html);
        if (blockPlain === captionPlain) {
          leadHandled = true;
          continue;
        }
      }
      leadHandled = true;
    }
    result.push(block);
  }

  return result;
}

/** Caption trên card photo/video — thu gọn khi dài (giống panel chữ). */
export function milestoneCardCaptionNeedsCollapse(
  caption: string | null | undefined,
): boolean {
  if (!caption?.trim()) return false;
  const paras = caption
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return chiChuNeedsCollapse(caption, paras.length);
}

/** Bài article trên timeline — có thêm nội dung ngoài preview card (blocks / chữ dài). */
export function articleCardNeedsDepthPreview(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
  hasCoverPreview: boolean,
): boolean {
  if (hasCoverPreview) return false;
  if (blocksForArticleCardUnfold(body, blocks).length > 0) return true;
  const caption = milestoneCardCaptionPlain(body, blocks);
  if (!caption) return false;
  const paras = caption
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return chiChuNeedsCollapse(caption, paras.length) || caption.length > 160;
}

/** Blocks trong vùng peek card article thu gọn — cùng logic unfold (bỏ đoạn trùng caption). */
export function articleCardPeekBlocks(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): Block[] {
  return blocksForArticleCardUnfold(body, blocks);
}

function blockEmbedConfigUrl(block: Block): string {
  const cfg = block.config ?? {};
  if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url.trim();
  if (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) {
    return cfg.embedUrl.trim();
  }
  return "";
}

function isInlineIframeEmbedBlock(block: Block): boolean {
  if (block.loai !== "embed") return false;
  const bunnyId =
    typeof block.config?.bunnyVideoId === "string"
      ? block.config.bunnyVideoId.trim()
      : "";
  if (bunnyId) return false;
  const url = blockEmbedConfigUrl(block);
  if (!url) return false;
  const cls = classifyEmbedUrl(url);
  if (!cls || cls.provider === "behance") return false;
  return buildEmbedIframeSrc(cls) !== null;
}

/** Timeline card — peek chỉ gồm block embed (có URL). */
export function articleCardHasEmbedOnlyPeek(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  const peek = blocksForArticleCardUnfold(body, blocks);
  if (!peek.some((b) => b.loai === "embed" && blockEmbedConfigUrl(b))) {
    return false;
  }
  return peek.every((b) => b.loai === "embed" || b.loai === "spacer");
}

/** Timeline card — file .riv host trên CINs (R2). */
export function resolveRiveFileEmbedPeek(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): { url: string } | null {
  const peek = blocksForArticleCardUnfold(body, blocks);
  if (!peek.length) return null;
  if (!peek.every((b) => b.loai === "embed" || b.loai === "spacer")) return null;
  const embeds = peek.filter((b) => b.loai === "embed");
  if (embeds.length !== 1) return null;
  const url = blockEmbedConfigUrl(embeds[0]!);
  const cls = classifyEmbedUrl(url);
  if (cls?.provider !== "rive-file") return null;
  return { url: cls.url };
}

/** Timeline card — file .lottie host trên CINs (R2). */
export function resolveLottieFileEmbedPeek(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): { url: string } | null {
  const peek = blocksForArticleCardUnfold(body, blocks);
  if (!peek.length) return null;
  if (!peek.every((b) => b.loai === "embed" || b.loai === "spacer")) return null;
  const embeds = peek.filter((b) => b.loai === "embed");
  if (embeds.length !== 1) return null;
  const url = blockEmbedConfigUrl(embeds[0]!);
  const cls = classifyEmbedUrl(url);
  if (cls?.provider !== "lottie-file") return null;
  return { url: cls.url };
}

/** Timeline card — embed Tier 1 fill peek, tương tác trực tiếp (không overlay «Xem đầy đủ»). */
export function resolveEmbedIframePeek(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): { provider: EmbedProviderId; iframeSrc: string } | null {
  const peek = blocksForArticleCardUnfold(body, blocks);
  if (!peek.length) return null;
  if (!peek.every((b) => b.loai === "embed" || b.loai === "spacer")) return null;
  const embeds = peek.filter((b) => b.loai === "embed");
  if (embeds.length !== 1) return null;
  const block = embeds[0]!;
  if (!isInlineIframeEmbedBlock(block)) return null;
  const url = blockEmbedConfigUrl(block);
  const cls = classifyEmbedUrl(url);
  if (!cls || cls.provider === "behance") return null;
  const iframeSrc = buildEmbedIframeSrc(cls);
  if (!iframeSrc) return null;
  return { provider: cls.provider, iframeSrc };
}

export function articleCardEmbedInteractivePeek(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  return (
    resolveEmbedIframePeek(body, blocks) !== null ||
    resolveRiveFileEmbedPeek(body, blocks) !== null ||
    resolveLottieFileEmbedPeek(body, blocks) !== null
  );
}

/** Timeline card — peek có block embed (kể cả kèm tiêu đề/chữ), không chỉ embed-only. */
export function articleCardPeekHasEmbedMedia(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  return blocksForArticleCardUnfold(body, blocks).some(
    (b) => b.loai === "embed" && Boolean(blockEmbedConfigUrl(b)),
  );
}

export function mediaPostHasContent(
  blocks: ReadonlyArray<Block>,
  kind: MediaPostKind,
): boolean {
  if (kind === "photo") {
    return blocks.some((b) => {
      if (b.loai !== "imgs") return false;
      const imgs = b.config?.imgs;
      return (
        Array.isArray(imgs) &&
        imgs.some((id) => typeof id === "string" && isPersistedImageSeed(id))
      );
    });
  }
  return blocks.some((b) => {
    if (b.loai !== "embed") return false;
    const url = b.config?.url;
    return typeof url === "string" && url.trim().length > 0;
  });
}

/** @deprecated — heading/quote vẫn là card chữ; dùng `hasArticleLayoutBlocks`. */
export function hasRichArticleBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  return hasArticleLayoutBlocks(blocks);
}

/** Một block body dài — vẫn là bài viết, không phải ảnh đơn. */
export function isSubstantialArticleBody(
  body: string | null | undefined,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  const plain = (plainTextCardPlain(body, blocks) ?? "").trim();
  if (plain.length > 360) return true;
  return plain.split(/\n\s*\n/).filter((p) => p.trim()).length > 2;
}

export function extractVideoUrl(
  blocks: ReadonlyArray<Block>,
): string | null {
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url = block.config?.url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

function extractYouTubeId(url: string): string | null {
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

/** Thumbnail YouTube — dùng fallback poster trên client khi server chưa resolve media. */
export function youtubeVideoThumbnailUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export type MediaEditInitial = {
  tacPhamId: string;
  cotMocId: string;
  postSlug: string;
  title: string;
  caption: string;
  visibility: Visibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  articleTags?: ArticleTagRef[];
  photoImageIds?: string[];
  videoUrl?: string;
  videoCanvasRatio?: import("@/lib/journey/video-canvas-ratio").VideoCanvasRatio;
  personalFilterIds?: string[];
  orgBaiDangLoai?: BaiDangLoai;
  orgBaiDangSchedulePublishAt?: string | null;
};

export function buildMediaEditInitial(params: {
  tacPhamId: string;
  cotMocId: string;
  postSlug: string;
  tieuDe: string;
  visibility: Visibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  blocks: ReadonlyArray<Block>;
  kind: MediaPostKind;
  articleTags?: ArticleTagRef[];
  personalFilterIds?: string[];
  orgBaiDangLoai?: BaiDangLoai;
  orgBaiDangSchedulePublishAt?: string | null;
}): MediaEditInitial {
  const caption = extractBodyCaption(params.blocks);
  return {
    tacPhamId: params.tacPhamId,
    cotMocId: params.cotMocId,
    postSlug: params.postSlug,
    title: initialMediaComposeTitle(params.tieuDe, params.kind),
    caption,
    visibility: params.visibility,
    loaiMoc: params.loaiMoc,
    thoiDiem: params.thoiDiem,
    articleTags: params.articleTags ?? [],
    photoImageIds:
      params.kind === "photo"
        ? extractPhotoImageIds(params.blocks)
        : undefined,
    videoUrl:
      params.kind === "video"
        ? (extractVideoUrl(params.blocks) ?? "")
        : undefined,
    videoCanvasRatio:
      params.kind === "video"
        ? (extractVideoCanvasRatio(params.blocks) ?? undefined)
        : undefined,
    personalFilterIds: params.personalFilterIds,
    orgBaiDangLoai: params.orgBaiDangLoai,
    orgBaiDangSchedulePublishAt: params.orgBaiDangSchedulePublishAt,
  };
}
