"use client";

import { useEffect, useMemo, useState } from "react";

import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  getCachedVideoAspect,
  subscribeVideoAspectCache,
} from "@/lib/journey/gallery-video-dimension-cache";
import {
  isGalleryVideoItem,
  portraitAspectFromCanvasRatio,
} from "@/lib/journey/gallery-video-orientation";
import { probeImageDimensions } from "@/lib/journey/probe-image-dimensions";
import { probeRemoteVideoDimensions } from "@/lib/journey/probe-remote-video-dimensions";
import { videoPreviewDimensionsFromRatio } from "@/lib/journey/video-canvas-ratio";

const FALLBACK_ASPECT = 16 / 9;

function isOrgCreateGalleryItem(item: GalleryMainItem): boolean {
  return (
    item.cardLayout === "cong-dong-create" ||
    item.cardLayout === "co-so-create" ||
    item.cardLayout === "studio-create"
  );
}

function isGenericImagePreset(width: number, height: number): boolean {
  return width === 640 && height === 360;
}

function isGenericVideoPreset(width: number, height: number): boolean {
  return width === 800 && height === 450;
}

function videoAspectFromItem(item: GalleryMainItem): number | null {
  const fromCanvas = portraitAspectFromCanvasRatio(item.videoCanvasRatio);
  if (fromCanvas) return fromCanvas;

  const mp4 = item.videoPreviewSrc?.trim();
  if (mp4) {
    const cached = getCachedVideoAspect(mp4);
    if (cached) return cached;
  }

  const w = item.width ?? 0;
  const h = item.height ?? 0;
  if (w > 0 && h > 0 && !isGenericVideoPreset(w, h)) return w / h;

  if (item.videoCanvasRatio) {
    const dims = videoPreviewDimensionsFromRatio(item.videoCanvasRatio);
    return dims.width / dims.height;
  }

  return null;
}

function seedAspect(item: GalleryMainItem): number {
  if (isGalleryVideoItem(item)) {
    return videoAspectFromItem(item) ?? FALLBACK_ASPECT;
  }

  const w = item.width ?? 0;
  const h = item.height ?? 0;
  if (w > 0 && h > 0 && !isGenericImagePreset(w, h)) return w / h;
  return FALLBACK_ASPECT;
}

async function probeItemAspect(item: GalleryMainItem): Promise<number | null> {
  if (isGalleryVideoItem(item)) {
    const hinted = videoAspectFromItem(item);
    if (hinted && portraitAspectFromCanvasRatio(item.videoCanvasRatio)) {
      return hinted;
    }

    const mp4 = item.videoPreviewSrc?.trim();
    if (mp4) {
      const cached = getCachedVideoAspect(mp4);
      if (cached) return cached;

      const dim = await probeRemoteVideoDimensions(mp4);
      if (dim && dim.width > 0 && dim.height > 0) {
        return dim.width / dim.height;
      }
    }

    return hinted;
  }

  const src = item.src?.trim();
  if (!src) return null;
  const dim = await probeImageDimensions(src);
  if (!dim) return null;
  return dim.width / dim.height;
}

export function useGalleryMasonryAspects(
  items: readonly GalleryMainItem[],
  enabled: boolean,
): ReadonlyMap<string, number> {
  const probeItems = useMemo(
    () => items.filter((item) => !isOrgCreateGalleryItem(item)),
    [items],
  );

  const [aspectById, setAspectById] = useState<Map<string, number>>(() => {
    if (!enabled) return new Map();
    return new Map(probeItems.map((item) => [item.id, seedAspect(item)]));
  });

  useEffect(() => {
    if (!enabled) {
      setAspectById(new Map());
      return;
    }

    const applyAspects = () => {
      const seeded = new Map(probeItems.map((item) => [item.id, seedAspect(item)]));
      setAspectById(seeded);
    };

    applyAspects();

    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        probeItems.map(async (item) => {
          const probed = await probeItemAspect(item);
          return {
            id: item.id,
            aspect: probed ?? seedAspect(item),
          };
        }),
      );
      if (cancelled) return;
      setAspectById(new Map(results.map((r) => [r.id, r.aspect])));
    })();

    const unsubCache = subscribeVideoAspectCache(() => {
      if (cancelled) return;
      setAspectById((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const item of probeItems) {
          if (!isGalleryVideoItem(item)) continue;
          const mp4 = item.videoPreviewSrc?.trim();
          if (!mp4) continue;
          const cached = getCachedVideoAspect(mp4);
          if (!cached) continue;
          if (next.get(item.id) === cached) continue;
          next.set(item.id, cached);
          changed = true;
        }
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
      unsubCache();
    };
  }, [enabled, probeItems]);

  return aspectById;
}
