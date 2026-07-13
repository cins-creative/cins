"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  packMasonryByAspect,
  resolveMasonryColumnCount,
  type MasonryColumnProfile,
  type MasonryPackCell,
} from "@/lib/journey/masonry-pack";

const FALLBACK_ASPECT = 16 / 9;
/** Width giả định lúc SSR — phải khớp mọi lần render đầu (không đọc `window`). */
const SSR_MASONRY_WIDTH = 1200;

export function useBalancedMasonryColumns(
  items: readonly GalleryMainItem[],
  aspectById: ReadonlyMap<string, number>,
  enabled: boolean,
  profile: MasonryColumnProfile = "gallery",
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(() =>
    resolveMasonryColumnCount(SSR_MASONRY_WIDTH, profile),
  );

  useEffect(() => {
    if (!enabled) return;
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const sync = (width: number) => {
      setColumnCount(resolveMasonryColumnCount(width, profile));
    };

    sync(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) sync(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, profile]);

  const columns = useMemo((): MasonryPackCell<GalleryMainItem>[][] | null => {
    if (!enabled) return null;
    const cells = items.map((item) => ({
      id: item.id,
      aspect: aspectById.get(item.id) ?? FALLBACK_ASPECT,
      data: item,
    }));
    return packMasonryByAspect(cells, columnCount);
  }, [items, aspectById, columnCount, enabled]);

  return { containerRef, columns, columnCount };
}
