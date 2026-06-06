import "server-only";

import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import type { Block } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { buildBunnyVideoThumbnailUrl } from "@/lib/bunny/thumbnail";
import { journeyImageFields } from "@/lib/journey/images";
import {
  detectMediaPostKind,
  extractPhotoImageIds,
  extractVideoUrl,
} from "@/lib/journey/post-media";

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

/** Preview ảnh/video trên milestone card — cover CF, ảnh album, thumbnail Bunny. */
export function milestonePreviewMedia(
  coverId: string | null | undefined,
  blocks: Block[] | null | undefined,
  label: string,
): MilestoneMediaItem[] {
  const parsed = blocks ?? [];
  const mediaKind = detectMediaPostKind(parsed);
  const trimmedCover = coverId?.trim() || null;

  if (trimmedCover && mediaKind !== "photo") {
    const fromCover = coverFromImageId(trimmedCover, label);
    if (fromCover.length > 0) return fromCover;
  }

  if (mediaKind === "photo") {
    const photoId = extractPhotoImageIds(parsed)[0] ?? trimmedCover;
    if (photoId) return coverFromImageId(photoId, label);
    return [];
  }

  if (mediaKind === "video") {
    const videoUrl = extractVideoUrl(parsed);
    if (videoUrl) {
      const bunny = classifyBunnyVideoUrl(videoUrl);
      const thumb = bunny ? buildBunnyVideoThumbnailUrl(bunny.videoId) : null;
      if (thumb) {
        return [{ src: thumb, width: 1280, height: 720, label }];
      }
    }
    if (trimmedCover) return coverFromImageId(trimmedCover, label);
    return [];
  }

  if (trimmedCover) return coverFromImageId(trimmedCover, label);
  return [];
}
