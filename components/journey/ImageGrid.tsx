"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import { ImageGridOverlay } from "@/components/journey/ImageGridOverlay";
import { ImageAlbumCarousel } from "@/components/journey/ImageAlbumCarousel";
import { ImageLightbox } from "@/components/journey/ImageLightbox";
import { handleBlockImageError } from "@/lib/editor/resolve-image-seed-url";
import {
  albumGridComposeRows,
  albumGridDisplayCount,
  albumGridLayoutCount,
  albumGridRemainingCount,
  gridThumbSrc,
  isPortraitGridImage,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  images: GridImage[];
  /** Nhóm ảnh đầu trong post → eager load. */
  isFirstGroup?: boolean;
  /** Ô đang upload (compose preview). */
  uploadingSlots?: ReadonlySet<number>;
  /** % upload theo index (compose preview). */
  uploadProgressBySlot?: ReadonlyMap<number, number>;
  /** Lỗi upload theo index (compose preview). */
  slotErrors?: ReadonlyMap<number, string>;
  /** Compose — không mở lightbox. */
  readOnly?: boolean;
  /** Compose — hiển thị mọi ảnh (không giới hạn 6 + overlay +N). */
  showAllImages?: boolean;
  /** Timeline card — chạm ảnh mở lightbox (kết hợp readOnly). */
  timelineLightbox?: boolean;
  /** Trang xem bài / popup — album ảnh: 1 ảnh + mũi tên trái/phải. */
  albumCarousel?: boolean;
  /** Lightbox controlled từ ngoài (vd. hero album + grid dùng chung overlay). */
  lightboxIndex?: number | null;
  onLightboxIndexChange?: (index: number | null) => void;
  /** Ảnh đầy đủ cho lightbox khi grid chỉ hiện subset (vd. album hero). */
  lightboxImages?: GridImage[];
  /** Cộng thêm vào index ô grid khi mở lightbox. */
  lightboxIndexOffset?: number;
};

type CellProps = {
  image: GridImage;
  slotIndex: number;
  isFirstGroup: boolean;
  useButtonCells: boolean;
  isUploading: boolean;
  uploadProgress?: number;
  slotError?: string;
  showOverlay: boolean;
  remaining: number;
  onOpen: (index: number) => void;
};

function ImageGridCell({
  image,
  slotIndex,
  isFirstGroup,
  useButtonCells,
  isUploading,
  uploadProgress,
  slotError,
  showOverlay,
  remaining,
  onOpen,
}: CellProps) {
  const CellTag = useButtonCells ? "button" : "div";

  return (
    <CellTag
      {...(useButtonCells
        ? {
            type: "button" as const,
            "aria-label":
              showOverlay
                ? `Xem thêm ${remaining} ảnh, bắt đầu từ ảnh ${slotIndex + 1}`
                : `Xem ảnh ${slotIndex + 1}`,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onOpen(slotIndex);
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
        loading={isFirstGroup && slotIndex === 0 ? "eager" : "lazy"}
        decoding="async"
        onError={handleBlockImageError}
      />
      {isUploading ? (
        <span className="image-grid-uploading" aria-busy="true">
          <Loader2 size={22} strokeWidth={2} className="mc-spin" />
          {typeof uploadProgress === "number" ? (
            <span className="image-grid-uploading-pct">{uploadProgress}%</span>
          ) : null}
        </span>
      ) : null}
      {slotError ? (
        <span className="image-grid-error" role="alert" title={slotError}>
          Upload lỗi
        </span>
      ) : null}
      {showOverlay ? <ImageGridOverlay count={remaining} /> : null}
    </CellTag>
  );
}

type RowRenderCtx = {
  displayImages: GridImage[];
  isFirstGroup: boolean;
  useButtonCells: boolean;
  uploadingSlots?: ReadonlySet<number>;
  /** % upload theo slot — hiện trên overlay spinner. */
  uploadProgressBySlot?: ReadonlyMap<number, number>;
  slotErrors?: ReadonlyMap<number, string>;
  overlaySlotIndex: number | null;
  remaining: number;
  onOpen: (index: number) => void;
};

function renderRow(
  indices: number[],
  cols: 2 | 3,
  ctx: RowRenderCtx,
): ReactNode {
  return (
    <div
      className={`image-grid-row${cols === 3 ? " image-grid-row--3" : ""}`}
    >
      {indices.map((slotIndex) => {
        const image = ctx.displayImages[slotIndex];
        if (!image) return null;
        return (
          <ImageGridCell
            key={`${image.id}-${slotIndex}`}
            image={image}
            slotIndex={slotIndex}
            isFirstGroup={ctx.isFirstGroup}
            useButtonCells={ctx.useButtonCells}
            isUploading={ctx.uploadingSlots?.has(slotIndex) ?? false}
            uploadProgress={ctx.uploadProgressBySlot?.get(slotIndex)}
            slotError={ctx.slotErrors?.get(slotIndex)}
            showOverlay={ctx.overlaySlotIndex === slotIndex}
            remaining={ctx.remaining}
            onOpen={ctx.onOpen}
          />
        );
      })}
    </div>
  );
}

export function ImageGrid({
  images,
  isFirstGroup = false,
  uploadingSlots,
  uploadProgressBySlot,
  slotErrors,
  readOnly = false,
  showAllImages = false,
  timelineLightbox = false,
  albumCarousel = false,
  lightboxIndex: controlledLightboxIndex,
  onLightboxIndexChange,
  lightboxImages: lightboxImagesProp,
  lightboxIndexOffset = 0,
}: Props) {
  const [internalLightboxIndex, setInternalLightboxIndex] = useState<number | null>(
    null,
  );
  const lightboxControlled = onLightboxIndexChange !== undefined;
  const lightboxIndex = lightboxControlled
    ? (controlledLightboxIndex ?? null)
    : internalLightboxIndex;
  const setLightboxIndex = lightboxControlled
    ? onLightboxIndexChange
    : setInternalLightboxIndex;
  const total = images.length;
  if (total === 0) return null;

  if (albumCarousel && total > 1) {
    return <ImageAlbumCarousel images={images} isFirstGroup={isFirstGroup} />;
  }

  const lightboxEnabled = !readOnly || timelineLightbox;
  const useButtonCells = lightboxEnabled;

  const displayCount = albumGridDisplayCount(total, showAllImages);
  const remaining = albumGridRemainingCount(total, showAllImages);
  const layoutCount = albumGridLayoutCount(total, showAllImages);
  const displayImages = images.slice(0, displayCount);
  const overlaySlotIndex =
    remaining > 0 ? displayCount - 1 : null;

  const lightboxPool = lightboxImagesProp ?? images;

  const openLightbox = useCallback(
    (index: number) => {
      if (!lightboxEnabled) return;
      setLightboxIndex(index + lightboxIndexOffset);
    },
    [lightboxEnabled, lightboxIndexOffset, setLightboxIndex],
  );

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const rowCtx: RowRenderCtx = {
    displayImages,
    isFirstGroup,
    useButtonCells,
    uploadingSlots,
    uploadProgressBySlot,
    slotErrors,
    overlaySlotIndex,
    remaining,
    onOpen: openLightbox,
  };

  const cell = (slotIndex: number) => {
    const image = displayImages[slotIndex];
    if (!image) return null;
    return (
      <ImageGridCell
        key={`${image.id}-${slotIndex}`}
        image={image}
        slotIndex={slotIndex}
        isFirstGroup={isFirstGroup}
        useButtonCells={useButtonCells}
        isUploading={uploadingSlots?.has(slotIndex) ?? false}
        uploadProgress={uploadProgressBySlot?.get(slotIndex)}
        slotError={slotErrors?.get(slotIndex)}
        showOverlay={overlaySlotIndex === slotIndex}
        remaining={remaining}
        onOpen={openLightbox}
      />
    );
  };

  let body: ReactNode;

  if (layoutCount === 1) {
    const single = displayImages[0];
    const portrait = single ? isPortraitGridImage(single) : false;
    body = (
      <div
        className={`image-grid image-grid--single${portrait ? " is-portrait" : ""}`}
        data-count="1"
      >
        {cell(0)}
      </div>
    );
  } else if (layoutCount === 2) {
    body = (
      <div className="image-grid" data-count="2">
        {cell(0)}
        {cell(1)}
      </div>
    );
  } else if (layoutCount === 3) {
    body = (
      <div className="image-grid" data-count="3">
        <div className="image-grid-main">{cell(0)}</div>
        <div className="image-grid-side">
          {cell(1)}
          {cell(2)}
        </div>
      </div>
    );
  } else if (layoutCount === 4) {
    body = (
      <div className="image-grid image-grid-col" data-count="4">
        {renderRow([0, 1], 2, rowCtx)}
        {renderRow([2, 3], 2, rowCtx)}
      </div>
    );
  } else if (layoutCount === 5) {
    body = (
      <div className="image-grid image-grid-col" data-count="5">
        {renderRow([0, 1], 2, rowCtx)}
        {renderRow([2, 3, 4], 3, rowCtx)}
      </div>
    );
  } else if (layoutCount === 6) {
    body = (
      <div className="image-grid image-grid-col" data-count="6">
        {renderRow([0, 1, 2], 3, rowCtx)}
        {renderRow([3, 4, 5], 3, rowCtx)}
      </div>
    );
  } else {
    const rows = albumGridComposeRows(displayCount);
    body = (
      <div className="image-grid image-grid-col" data-count={layoutCount}>
        {rows.map((indices, rowIdx) => (
          <div
            key={`row-${rowIdx}`}
            className={`image-grid-row${
              indices.length === 3 ? " image-grid-row--3" : ""
            }`}
          >
            {indices.map((slotIndex) => cell(slotIndex))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {body}

      {lightboxEnabled && lightboxIndex !== null ? (
        <ImageLightbox
          images={lightboxPool}
          index={lightboxIndex}
          onClose={closeLightbox}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </>
  );
}
