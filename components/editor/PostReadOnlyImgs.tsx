"use client";

import { useState } from "react";

import { ImageLightbox } from "@/components/journey/ImageLightbox";
import {
  flattenMosaicCells,
  normalizeLegacyLayout,
  type ImgLayout,
} from "@/lib/editor/image-layout";
import {
  handleBlockImageError,
  resolveImageSeedUrl,
} from "@/lib/editor/resolve-image-seed-url";
import type { Block } from "@/lib/editor/types";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  block: Block;
};

/**
 * Block `imgs` read-only (layout full/grid3/…) — giữ markup `.b-imgs` như editor,
 * gắn lightbox (album grid Facebook-style dùng `ImageGrid` riêng).
 */
export function PostReadOnlyImgs({ block }: Props) {
  const cfg = block.config || {};
  const layout: ImgLayout = normalizeLegacyLayout(cfg.layout);
  const rounded = !!cfg.rounded;
  const cap = typeof cfg.cap === "string" ? cfg.cap : "";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const rawImgs = Array.isArray(cfg.imgs)
    ? (cfg.imgs as unknown[])
        .map((s) => (typeof s === "string" ? s : ""))
        .filter(Boolean)
    : [];
  const imgs = (
    rawImgs.length > 0 ? rawImgs : flattenMosaicCells(cfg.cells)
  ).filter((s) => !/^m-|^extra-/.test(s));
  if (imgs.length === 0) return null;

  const width =
    typeof cfg.width === "number" && cfg.width > 0
      ? Math.round(cfg.width)
      : GRID_IMAGE_DEFAULT_WIDTH;
  const height =
    typeof cfg.height === "number" && cfg.height > 0
      ? Math.round(cfg.height)
      : GRID_IMAGE_DEFAULT_HEIGHT;
  const gridImages: GridImage[] = imgs.map((id) => ({ id, width, height }));

  return (
    <div className="b-imgs b-imgs-ro">
      <div className={`imgwrap ${layout}${rounded ? " rounded" : ""}`}>
        {imgs.map((seed, i) => (
          <button
            key={`${seed}-${i}`}
            type="button"
            className="ph is-lightbox"
            aria-label="Xem ảnh lớn"
            onClick={() => setLightboxIndex(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageSeedUrl(seed, 900, 900)}
              alt=""
              loading="lazy"
              onError={handleBlockImageError}
            />
          </button>
        ))}
      </div>
      {cap ? <div className="img-cap img-cap-ro">{cap}</div> : null}
      {lightboxIndex !== null ? (
        <ImageLightbox
          images={gridImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
