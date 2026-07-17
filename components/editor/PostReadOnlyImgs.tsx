"use client";

import {
  useCallback,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";

import { ImageLightbox } from "@/components/journey/ImageLightbox";
import {
  flattenMosaicCells,
  normalizeImgSlotGap,
  normalizeLegacyLayout,
  splitEditorJustifiedRows,
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
  justifiedRowCanvasAspect,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  block: Block;
};

/**
 * Block `imgs` read-only (layout full/grid3/justified…) — giữ markup `.b-imgs`
 * như EditorView. Justified dùng `.imgwrap-jrow` + aspect thật (không crop).
 */
export function PostReadOnlyImgs({ block }: Props) {
  const cfg = block.config || {};
  const layout: ImgLayout = normalizeLegacyLayout(cfg.layout);
  const rounded = !!cfg.rounded;
  const gap = normalizeImgSlotGap(cfg.gap);
  const cap = typeof cfg.cap === "string" ? cfg.cap : "";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [aspectBySlot, setAspectBySlot] = useState<Record<number, number>>({});

  const rawImgs = Array.isArray(cfg.imgs)
    ? (cfg.imgs as unknown[])
        .map((s) => (typeof s === "string" ? s : ""))
        .filter(Boolean)
    : [];
  const imgs = (
    rawImgs.length > 0 ? rawImgs : flattenMosaicCells(cfg.cells)
  ).filter((s) => !/^m-|^extra-/.test(s));

  const reportAspect = useCallback((slot: number, aspect: number) => {
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    setAspectBySlot((prev) => {
      if (prev[slot] != null && Math.abs(prev[slot]! - aspect) < 0.001) {
        return prev;
      }
      return { ...prev, [slot]: aspect };
    });
  }, []);

  const onImgLoad = useCallback(
    (slot: number, e: SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        reportAspect(slot, img.naturalWidth / img.naturalHeight);
      }
    },
    [reportAspect],
  );

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

  const renderSlot = (
    seed: string,
    index: number,
    style?: CSSProperties,
  ) => (
    <button
      key={`${seed}-${index}`}
      type="button"
      className="ph is-lightbox"
      aria-label="Xem ảnh lớn"
      style={style}
      onClick={() => setLightboxIndex(index)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveImageSeedUrl(seed, 900, 900)}
        alt=""
        loading="lazy"
        onLoad={
          layout === "justified" ? (e) => onImgLoad(index, e) : undefined
        }
        onError={handleBlockImageError}
      />
    </button>
  );

  const fallbackAspect =
    width > 0 && height > 0 ? width / height : 1;

  const justifiedRows =
    layout === "justified"
      ? splitEditorJustifiedRows(
          imgs.map((seed, index) => ({
            seed,
            index,
            aspect: aspectBySlot[index] ?? fallbackAspect,
          })),
        )
      : null;

  return (
    <div className="b-imgs b-imgs-ro">
      <div
        className={`imgwrap ${layout}${rounded ? " rounded" : ""}`}
        style={
          {
            "--cins-img-slot-gap": `${gap}px`,
          } as CSSProperties
        }
      >
        {justifiedRows
          ? justifiedRows.map((row, ri) => (
              <div
                key={`${block.id}-jrow-${ri}`}
                className="imgwrap-jrow"
                style={{ aspectRatio: String(justifiedRowCanvasAspect(row)) }}
              >
                {row.map((cell) =>
                  renderSlot(cell.seed, cell.index, {
                    flexGrow: cell.aspect,
                  }),
                )}
              </div>
            ))
          : imgs.map((seed, i) => renderSlot(seed, i))}
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
