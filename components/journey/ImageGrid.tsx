"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { ImageGridOverlay } from "@/components/journey/ImageGridOverlay";
import { ImageLightbox } from "@/components/journey/ImageLightbox";
import {
  facebookGridDisplayCount,
  facebookGridRemainingCount,
  gridThumbSrc,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  images: GridImage[];
  /** Nhóm ảnh đầu trong post → eager load. */
  isFirstGroup?: boolean;
  /** Ô đang upload (compose preview). */
  uploadingSlots?: ReadonlySet<number>;
  /** Compose — không mở lightbox. */
  readOnly?: boolean;
  /** Timeline card — chạm ảnh mở lightbox (kết hợp readOnly). */
  timelineLightbox?: boolean;
};

export function ImageGrid({
  images,
  isFirstGroup = false,
  uploadingSlots,
  readOnly = false,
  timelineLightbox = false,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const total = images.length;
  if (total === 0) return null;

  const lightboxEnabled = !readOnly || timelineLightbox;
  const useButtonCells = lightboxEnabled;

  const displayCount = facebookGridDisplayCount(total);
  const remaining = facebookGridRemainingCount(total);
  const displayImages = images.slice(0, displayCount);
  const dataCount = total >= 5 ? 5 : displayCount;

  const openLightbox = useCallback((index: number) => {
    if (!lightboxEnabled) return;
    setLightboxIndex(index);
  }, [lightboxEnabled]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const CellTag = useButtonCells ? "button" : "div";

  return (
    <>
      <div className="image-grid" data-count={dataCount}>
        {displayImages.map((image, slotIndex) => {
          const globalIndex = slotIndex;
          const isLastDisplayed = slotIndex === displayCount - 1;
          const showOverlay = isLastDisplayed && remaining > 0;
          const isUploading = uploadingSlots?.has(globalIndex);

          return (
            <CellTag
              key={`${image.id}-${globalIndex}`}
              {...(useButtonCells
                ? {
                    type: "button" as const,
                    "aria-label":
                      showOverlay
                        ? `Xem thêm ${remaining} ảnh, bắt đầu từ ảnh ${globalIndex + 1}`
                        : `Xem ảnh ${globalIndex + 1}`,
                    onClick: (e: React.MouseEvent) => {
                      e.stopPropagation();
                      openLightbox(showOverlay ? 4 : globalIndex);
                    },
                  }
                : { "aria-hidden": true as const })}
              className="image-grid-cell"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gridThumbSrc(image)}
                alt=""
                width={image.width}
                height={image.height}
                loading={
                  isFirstGroup && globalIndex === 0 ? "eager" : "lazy"
                }
                decoding="async"
              />
              {isUploading ? (
                <span className="image-grid-uploading" aria-busy="true">
                  <Loader2 size={22} strokeWidth={2} className="mc-spin" />
                </span>
              ) : null}
              {showOverlay ? <ImageGridOverlay count={remaining} /> : null}
            </CellTag>
          );
        })}
      </div>

      {lightboxEnabled && lightboxIndex !== null ? (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </>
  );
}
