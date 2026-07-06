import "server-only";

import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import { journeyImageFields } from "@/lib/journey/images";
import {
  detectMediaPostKind,
  extractAllImageIds,
} from "@/lib/journey/post-media";
import { resolveBunnyVideoThumbnailFromBlocks } from "@/lib/journey/video-embed";

function coverFromImageId(
  imageId: string,
  label: string,
): MilestoneMediaItem[] {
  const img = journeyImageFields(imageId, "milestone-preview");
  if (!img?.src) return [];
  return [
    {
      src: img.src,
      srcSet: img.srcSet,
      width: img.width,
      height: img.height,
      label,
    },
  ];
}

/**
 * Preview ảnh/video trên milestone card (article cover, video thumb).
 * Bài album ảnh: chỉ trả preview khi có `cover_id` tuỳ chọn — ảnh album render từ blocks;
 * thumb Gallery dùng `resolveGalleryVisual` (ảnh đầu album khi không có cover).
 */
export function milestonePreviewMedia(
  coverId: string | null | undefined,
  blocks: Block[] | null | undefined,
  label: string,
): MilestoneMediaItem[] {
  const parsed = blocks ?? [];
  const mediaKind = detectMediaPostKind(parsed);
  const trimmedCover = coverId?.trim() || null;

  if (mediaKind === "video") {
    const thumb = resolveBunnyVideoThumbnailFromBlocks(parsed);
    if (thumb) {
      return [{ src: thumb, width: 1280, height: 720, label }];
    }
    if (trimmedCover) return coverFromImageId(trimmedCover, label);
    return [];
  }

  if (mediaKind === "photo") {
    const photoIds = extractAllImageIds(parsed);
    if (photoIds.length > 0) return [];
    if (trimmedCover) return coverFromImageId(trimmedCover, label);
    return [];
  }

  if (trimmedCover) return coverFromImageId(trimmedCover, label);
  return [];
}
