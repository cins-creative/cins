"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { computeJustifiedRows } from "@/lib/truong/gallery-justified";
import { hinhAnhDisplayUrlCandidates } from "@/lib/truong/hinh-anh-display";
import type { TruongHinhAnh } from "@/lib/truong/types";

type Props = {
  images: TruongHinhAnh[];
  renderOverlay?: (img: TruongHinhAnh) => React.ReactNode;
  defaultAspect?: number;
};

export function TruongGalleryJustified({
  images,
  renderOverlay,
  defaultAspect = 4 / 3,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [srcIndex, setSrcIndex] = useState<Record<string, number>>({});

  const onImgLoad = useCallback((id: string, el: HTMLImageElement) => {
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    if (!w || !h) return;
    const ar = w / h;
    setAspects((prev) => (prev[id] === ar ? prev : { ...prev, [id]: ar }));
  }, []);

  const onImgError = useCallback((id: string, candidates: string[]) => {
    const idx = srcIndex[id] ?? 0;
    if (idx + 1 < candidates.length) {
      setSrcIndex((prev) => ({ ...prev, [id]: idx + 1 }));
    }
  }, [srcIndex]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const items = useMemo(
    () =>
      images
        .map((img) => {
          const candidates = hinhAnhDisplayUrlCandidates(img);
          if (!candidates.length) return null;
          const idx = srcIndex[img.id] ?? 0;
          const src = candidates[Math.min(idx, candidates.length - 1)];
          return {
            id: img.id,
            src,
            candidates,
            aspectRatio: aspects[img.id] ?? defaultAspect,
            img,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [images, aspects, defaultAspect, srcIndex],
  );

  const rows = useMemo(
    () =>
      computeJustifiedRows(
        items.map((x) => ({ id: x.id, aspectRatio: x.aspectRatio })),
        width,
        { gap: 6, targetRowHeight: 148, maxRowHeight: 240 },
      ),
    [items, width],
  );

  const byId = useMemo(() => new Map(items.map((x) => [x.id, x])), [items]);

  if (!items.length) return null;

  return (
    <div ref={rootRef} className="tdh-gallery-justified">
      {width > 0
        ? rows.map((row, ri) => (
            <div
              key={`row-${ri}`}
              className="tdh-gallery-justified-row"
              style={{ height: row.height, gap: 6 }}
            >
              {row.items.map((cell) => {
                const entry = byId.get(cell.id);
                if (!entry?.src) return null;
                return (
                  <div
                    key={cell.id}
                    className="tdh-gallery-justified-cell gallery-cell"
                    style={{ width: cell.width, height: cell.height }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.src}
                      alt={entry.img.caption ?? ""}
                      className="tdh-gallery-justified-img"
                      loading="lazy"
                      decoding="async"
                      onLoad={(e) => onImgLoad(cell.id, e.currentTarget)}
                      onError={() => onImgError(cell.id, entry.candidates)}
                    />
                    {renderOverlay ? renderOverlay(entry.img) : null}
                  </div>
                );
              })}
            </div>
          ))
        : null}
    </div>
  );
}
