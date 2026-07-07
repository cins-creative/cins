"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCachedVideoAspect,
  subscribeVideoAspectCache,
} from "@/lib/journey/gallery-video-dimension-cache";
import {
  isGalleryVideoItem,
  isLikelyPortraitGalleryVideo,
  isPortraitVideoDimensions,
  portraitAspectFromCanvasRatio,
} from "@/lib/journey/gallery-video-orientation";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { probeRemoteVideoDimensions } from "@/lib/journey/probe-remote-video-dimensions";

export type GalleryPortraitVideoState = {
  portraitIds: ReadonlySet<string>;
  aspectById: ReadonlyMap<string, number>;
};

function seedPortraitState(
  items: readonly GalleryMainItem[],
): GalleryPortraitVideoState {
  const portraitIds = new Set<string>();
  const aspectById = new Map<string, number>();

  for (const item of items) {
    if (!isGalleryVideoItem(item)) continue;
    if (!isLikelyPortraitGalleryVideo(item)) continue;
    portraitIds.add(item.id);
    const hinted = portraitAspectFromCanvasRatio(item.videoCanvasRatio);
    if (hinted) aspectById.set(item.id, hinted);
  }

  return { portraitIds, aspectById };
}

export function useGalleryPortraitVideoIds(
  items: readonly GalleryMainItem[],
  enabled: boolean,
): GalleryPortraitVideoState {
  const videoItems = useMemo(
    () => items.filter(isGalleryVideoItem),
    [items],
  );

  const [state, setState] = useState<GalleryPortraitVideoState>(() =>
    enabled ? seedPortraitState(items) : { portraitIds: new Set(), aspectById: new Map() },
  );

  useEffect(() => {
    if (!enabled) {
      setState({ portraitIds: new Set(), aspectById: new Map() });
      return;
    }

    setState(seedPortraitState(items));

    let cancelled = false;
    const probes = videoItems
      .map((item) => item.videoPreviewSrc?.trim() || null)
      .filter((src): src is string => Boolean(src));

    if (probes.length === 0) return;

    void (async () => {
      const results = await Promise.all(
        videoItems.map(async (item) => {
          const src = item.videoPreviewSrc?.trim();
          if (!src) return { id: item.id, portrait: false as const };
          const cached = getCachedVideoAspect(src);
          if (cached) {
            const portrait = cached < 1;
            return portrait
              ? { id: item.id, portrait: true as const, aspect: cached }
              : { id: item.id, portrait: false as const };
          }
          const dim = await probeRemoteVideoDimensions(src);
          if (!dim) return { id: item.id, portrait: false as const };
          return {
            id: item.id,
            portrait: isPortraitVideoDimensions(dim.width, dim.height),
            aspect: dim.width / dim.height,
          };
        }),
      );

      if (cancelled) return;

      setState(() => {
        const portraitIds = new Set<string>();
        const aspectById = new Map<string, number>();

        for (const result of results) {
          if (!result.portrait) continue;
          portraitIds.add(result.id);
          if ("aspect" in result && result.aspect) {
            aspectById.set(result.id, result.aspect);
          }
        }

        for (const item of videoItems) {
          if (item.videoPreviewSrc?.trim()) continue;
          if (!isLikelyPortraitGalleryVideo(item)) continue;
          portraitIds.add(item.id);
          const hinted = portraitAspectFromCanvasRatio(item.videoCanvasRatio);
          if (hinted) aspectById.set(item.id, hinted);
        }

        return { portraitIds, aspectById };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, items, videoItems]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeVideoAspectCache(() => {
      setState((prev) => {
        let changed = false;
        const portraitIds = new Set(prev.portraitIds);
        const aspectById = new Map(prev.aspectById);

        for (const item of videoItems) {
          const src = item.videoPreviewSrc?.trim();
          if (!src) continue;
          const cached = getCachedVideoAspect(src);
          if (!cached) continue;
          const portrait = cached < 1;
          if (portrait) {
            if (!portraitIds.has(item.id)) {
              portraitIds.add(item.id);
              changed = true;
            }
            if (aspectById.get(item.id) !== cached) {
              aspectById.set(item.id, cached);
              changed = true;
            }
          } else if (portraitIds.has(item.id)) {
            portraitIds.delete(item.id);
            aspectById.delete(item.id);
            changed = true;
          }
        }

        return changed ? { portraitIds, aspectById } : prev;
      });
    });
  }, [enabled, videoItems]);

  return state;
}
