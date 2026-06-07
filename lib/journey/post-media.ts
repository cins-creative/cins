import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";

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

export function extractBodyCaption(
  blocks: ReadonlyArray<Block> | null | undefined,
): string {
  if (!blocks) return "";
  const body = blocks.find((b) => b.loai === "body");
  const html = body?.config?.html;
  return typeof html === "string" ? html : "";
}

export function deriveMediaPostTitle(
  caption: string,
  kind: MediaPostKind,
): string {
  const line = caption.trim().split("\n")[0]?.trim();
  if (line) return line.slice(0, 120);
  return kind === "video" ? "Video mới" : "Ảnh mới";
}

const MEDIA_FALLBACK_TITLES: Record<MediaPostKind, string> = {
  photo: "Ảnh mới",
  video: "Video mới",
};

/** Tiêu đề DB auto — không phải H1 do user nhập. */
export function isMediaFallbackTitle(
  title: string,
  kind: MediaPostKind,
): boolean {
  return title.trim() === MEDIA_FALLBACK_TITLES[kind];
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

/** Card timeline: bài media không có H1 riêng → ẩn title fallback. */
export function shouldShowMilestoneCardTitle(
  title: string,
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  const kind = detectMediaPostKind(blocks);
  if (!kind) return Boolean(title.trim());
  if (isMediaFallbackTitle(title, kind)) return false;
  const captionLine = extractBodyCaption(blocks).trim().split("\n")[0]?.trim() ?? "";
  if (captionLine && title.trim() === captionLine.slice(0, 120)) return false;
  return Boolean(title.trim());
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
  caption: string;
  visibility: Visibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  photoImageIds?: string[];
  videoUrl?: string;
  personalFilterIds?: string[];
};

export function buildMediaEditInitial(params: {
  tacPhamId: string;
  cotMocId: string;
  postSlug: string;
  visibility: Visibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  blocks: ReadonlyArray<Block>;
  kind: MediaPostKind;
  personalFilterIds?: string[];
}): MediaEditInitial {
  const caption = extractBodyCaption(params.blocks);
  return {
    tacPhamId: params.tacPhamId,
    cotMocId: params.cotMocId,
    postSlug: params.postSlug,
    caption,
    visibility: params.visibility,
    loaiMoc: params.loaiMoc,
    thoiDiem: params.thoiDiem,
    photoImageIds:
      params.kind === "photo"
        ? extractPhotoImageIds(params.blocks)
        : undefined,
    videoUrl:
      params.kind === "video"
        ? (extractVideoUrl(params.blocks) ?? "")
        : undefined,
    personalFilterIds: params.personalFilterIds,
  };
}
