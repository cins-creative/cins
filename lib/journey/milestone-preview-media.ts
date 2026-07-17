import "server-only";

import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import {
  coverThumbAspectCss,
  coverThumbObjectPosition,
  coverThumbZoom,
  findCoverThumbMeta,
} from "@/lib/journey/cover-thumb";
import {
  journeyImageFields,
  journeyImageFieldsWithCoverThumb,
} from "@/lib/journey/images";
import { detectMediaPostKind } from "@/lib/journey/post-media";
import { shouldShowCoverOnPostCard } from "@/lib/journey/post-content-kind";
import { resolveBunnyVideoThumbnailFromBlocks } from "@/lib/journey/video-embed";
import {
  extractVideoCanvasRatio,
  videoPreviewDimensionsFromRatio,
} from "@/lib/journey/video-canvas-ratio";

function coverFromImageId(
  imageId: string,
  label: string,
  blocks: Block[] | null | undefined,
): MilestoneMediaItem[] {
  const meta = findCoverThumbMeta(blocks);
  const img = meta
    ? journeyImageFieldsWithCoverThumb(imageId, meta)
    : journeyImageFields(imageId, "milestone-preview");
  if (!img?.src) return [];
  return [
    {
      src: img.src,
      srcSet: img.srcSet,
      width: img.width,
      height: img.height,
      label,
      objectPosition: meta ? coverThumbObjectPosition(meta) : undefined,
      aspectRatio: meta ? coverThumbAspectCss(meta) : undefined,
      zoom: meta ? coverThumbZoom(meta) : undefined,
    },
  ];
}

/**
 * Preview ảnh/video trên milestone card (article cover, video thumb).
 * Bài album ảnh: trả cover khi có `cover_id` và cờ «hiện thumbnail» bật
 * (hero / `album_hero_grid`); ảnh album vẫn render từ blocks.
 * Tắt cờ → không đưa `cover_id` lên card (Gallery vẫn dùng cover riêng).
 */
export function milestonePreviewMedia(
  coverId: string | null | undefined,
  blocks: Block[] | null | undefined,
  label: string,
): MilestoneMediaItem[] {
  const parsed = blocks ?? [];
  const mediaKind = detectMediaPostKind(parsed);
  const trimmedCover =
    coverId?.trim() && shouldShowCoverOnPostCard(parsed)
      ? coverId.trim()
      : null;

  if (mediaKind === "video") {
    if (trimmedCover) return coverFromImageId(trimmedCover, label, parsed);
    const thumb = resolveBunnyVideoThumbnailFromBlocks(parsed);
    if (thumb) {
      const dims = videoPreviewDimensionsFromRatio(
        extractVideoCanvasRatio(parsed),
      );
      return [{ src: thumb, width: dims.width, height: dims.height, label }];
    }
    return [];
  }

  if (mediaKind === "photo") {
    /* Cover tuỳ chọn → `media[0]` khi được phép hiện — khớp compose + album_hero. */
    if (trimmedCover) return coverFromImageId(trimmedCover, label, parsed);
    return [];
  }

  if (trimmedCover) return coverFromImageId(trimmedCover, label, parsed);
  return [];
}
