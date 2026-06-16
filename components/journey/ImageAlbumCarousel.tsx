"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  gridLightboxSrc,
  isPortraitGridImage,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  images: GridImage[];
  isFirstGroup?: boolean;
};

export function ImageAlbumCarousel({ images, isFirstGroup = false }: Props) {
  const total = images.length;
  const [index, setIndex] = useState(0);
  const safeIndex =
    total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;
  const current = images[safeIndex];

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, total]);

  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const naturalSizeByIdRef = useRef(
    new Map<string, { width: number; height: number }>(),
  );
  const imageKey = useMemo(
    () => images.map((image) => image.id).join("\0"),
    [images],
  );

  useEffect(() => {
    if (images.length === 0) return;

    naturalSizeByIdRef.current.clear();
    const loaders: HTMLImageElement[] = [];
    for (const image of images) {
      const src = gridLightboxSrc(image);
      const loader = new Image();
      loader.decoding = "async";
      loader.onload = () => {
        if (loader.naturalWidth <= 0 || loader.naturalHeight <= 0) return;
        naturalSizeByIdRef.current.set(image.id, {
          width: loader.naturalWidth,
          height: loader.naturalHeight,
        });
      };
      loader.src = src;
      loaders.push(loader);
    }

    return () => {
      for (const loader of loaders) {
        loader.onload = null;
        loader.src = "";
      }
    };
  }, [imageKey, images]);

  useEffect(() => {
    const cached = current?.id
      ? naturalSizeByIdRef.current.get(current.id)
      : null;
    setNaturalSize(cached ?? null);
  }, [safeIndex, current?.id]);

  if (!current) return null;

  const portrait = naturalSize
    ? naturalSize.height > naturalSize.width
    : isPortraitGridImage(current);

  return (
    <div
      className={`image-album-carousel${portrait ? " is-portrait" : ""}`}
      data-count={total}
      role="region"
      aria-roledescription="carousel"
      aria-label="Album ảnh"
    >
      <div className="image-album-carousel-stage">
        <figure className="image-album-carousel-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gridLightboxSrc(current)}
            alt=""
            width={naturalSize?.width ?? current.width}
            height={naturalSize?.height ?? current.height}
            loading="eager"
            decoding="async"
            fetchPriority={isFirstGroup && safeIndex === 0 ? "high" : "auto"}
            onLoad={(event) => {
              const img = event.currentTarget;
              if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
              setNaturalSize({
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            }}
          />
        </figure>

        {total > 1 ? (
          <>
            <button
              type="button"
              className="image-album-carousel-nav image-album-carousel-nav--prev"
              aria-label="Ảnh trước"
              onClick={goPrev}
            >
              <ChevronLeft size={24} strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              className="image-album-carousel-nav image-album-carousel-nav--next"
              aria-label="Ảnh sau"
              onClick={goNext}
            >
              <ChevronRight size={24} strokeWidth={2.2} aria-hidden />
            </button>
            <p className="image-album-carousel-counter" aria-live="polite">
              {safeIndex + 1}/{total}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
