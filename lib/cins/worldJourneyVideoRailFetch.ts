import "server-only";

import {
  WORLD_JOURNEY_VIDEO_RAIL_POOL,
} from "@/lib/cins/worldJourneyFeedConstants";
import {
  fetchWorldJourneyVideoPoolItemsCached,
  type WorldJourneyGalleryPage,
} from "@/lib/cins/worldJourneyGalleryFetch";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  isPortraitVideoOrientation,
  resolveVideoCanvasRatio,
  videoOrientationFromCanvasRatio,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";

/** Video dọc (9:16 / 3:4) — ưu tiên `videoCanvasRatio`, fallback width/height. */
export function isPortraitGalleryVideo(item: GalleryMainItem): boolean {
  if (!item.streamUid?.trim()) return false;

  const ratio: VideoCanvasRatio | null | undefined = item.videoCanvasRatio;
  if (ratio) {
    return isPortraitVideoOrientation(videoOrientationFromCanvasRatio(ratio));
  }

  const w = item.width ?? 0;
  const h = item.height ?? 0;
  if (w > 0 && h > 0) {
    return isPortraitVideoOrientation(
      videoOrientationFromCanvasRatio(resolveVideoCanvasRatio(w, h)),
    );
  }

  return false;
}

function slicePortraitPage(
  items: ReadonlyArray<GalleryMainItem>,
  offset: number,
  limit: number,
): WorldJourneyGalleryPage {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), WORLD_JOURNEY_VIDEO_RAIL_POOL * 4);
  const page = items.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + page.length;
  return {
    items: [...page],
    hasMore: nextOffset < items.length,
    nextOffset,
    totalCount: items.length,
  };
}

/**
 * Trang video dọc cho railbar xen feed — lọc portrait từ pool Stream WJ.
 */
export async function fetchWorldJourneyVideoRailPageCached(
  viewerId: string,
  offset = 0,
  limit = WORLD_JOURNEY_VIDEO_RAIL_POOL,
): Promise<WorldJourneyGalleryPage> {
  const pool = await fetchWorldJourneyVideoPoolItemsCached(viewerId);
  const portrait = pool.filter(isPortraitGalleryVideo);
  return slicePortraitPage(portrait, offset, limit);
}
