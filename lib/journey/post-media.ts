import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
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

export type GalleryMediaKind = "article" | "photo" | "video";

export function galleryMediaKindFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): GalleryMediaKind {
  const kind = detectMediaPostKind(blocks);
  if (kind === "photo") return "photo";
  if (kind === "video") return "video";
  return "article";
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

/** Card timeline: chỉ hiện tiêu đề khi user thật sự nhập (không fallback). */
export function shouldShowMilestoneCardTitle(
  title: string,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  const kind = detectMediaPostKind(blocks);
  if (!kind) return !isArticleFallbackTitle(title);
  if (isMediaFallbackTitle(title, kind)) return false;
  const captionLine = extractBodyCaption(blocks).trim().split("\n")[0]?.trim() ?? "";
  if (captionLine && title.trim() === captionLine.slice(0, 120)) return false;
  return Boolean(title.trim());
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
  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
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
        imgs.some((id) => typeof id === "string" && id.trim().length > 0)
      );
    });
  }
  return blocks.some((b) => {
    if (b.loai !== "embed") return false;
    const url = b.config?.url;
    return typeof url === "string" && url.trim().length > 0;
  });
}

/** Trích id ảnh theo thứ tự block — mỗi block `imgs` thường 1 ảnh. */
export function extractPhotoImageIds(
  blocks: ReadonlyArray<Block>,
): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.loai !== "imgs" || block.config?.layout === "mosaic") continue;
    const raw = block.config?.imgs;
    if (!Array.isArray(raw)) continue;
    for (const id of raw) {
      if (typeof id === "string" && id.trim()) ids.push(id.trim());
    }
  }
  return ids;
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
    personalFilterIds: params.personalFilterIds,
    orgBaiDangLoai: params.orgBaiDangLoai,
    orgBaiDangSchedulePublishAt: params.orgBaiDangSchedulePublishAt,
  };
}
