"use client";

import { Check, ClipboardPaste, ImagePlus, Loader2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { ImageGridOverlay } from "@/components/journey/ImageGridOverlay";
import { ImageAlbumCarousel } from "@/components/journey/ImageAlbumCarousel";
import { ImageLightbox } from "@/components/journey/ImageLightbox";
import { ImageUploadProgressOverlay } from "@/components/ui/ImageUploadProgressOverlay";
import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";
import { handleBlockImageError } from "@/lib/editor/resolve-image-seed-url";
import {
  albumGridComposeRows,
  gridThumbAsset,
  justifiedRowCanvasAspect,
  resolveAlbumLayout,
  splitJustifiedRows,
  type AlbumCell,
  type GridImage,
  type GridUploadSlotState,
} from "@/lib/journey/image-grid";
import {
  insertIndexFromSnap,
  sameDragSnap,
  snapFromPointer,
  type DragSnapTarget,
} from "@/lib/editor/image-slot-dnd";

/** CF variant nhỏ/crop có thể 403 hoặc lệch — thử `public` trước khi ẩn ảnh. */
function handleGridThumbError(e: { currentTarget: HTMLImageElement }): void {
  const img = e.currentTarget;
  const current = img.currentSrc || img.src;
  if (
    /imagedelivery\.net/i.test(current) &&
    img.dataset.cfPublicFallback !== "1"
  ) {
    const next = swapCfImageVariant(current, "public");
    if (next !== current) {
      img.dataset.cfPublicFallback = "1";
      img.removeAttribute("srcset");
      img.src = next;
      return;
    }
  }
  handleBlockImageError(e);
}

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
  /** Trạng thái upload đầy đủ theo index (ưu tiên hơn uploadingSlots / slotErrors). */
  uploadBySlot?: ReadonlyMap<number, GridUploadSlotState>;
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
  /** Compose album — đổi / dán / xóa / kéo sắp xếp từng ô. */
  composeSlotActions?: {
    onPickImage: (slotIndex: number) => void;
    onPasteImage: (slotIndex: number) => void;
    onRemoveImage: (slotIndex: number) => void;
    /** Kéo thả đổi thứ tự ảnh trong album (≥2 ảnh). */
    onReorderImages?: (fromSlot: number, toSlot: number) => void;
  };
};

const ALBUM_SLOT_MIME = "application/x-cins-album-slot";

type CellProps = {
  image: GridImage;
  slotIndex: number;
  isFirstGroup: boolean;
  useButtonCells: boolean;
  isUploading: boolean;
  uploadProgress?: number;
  slotError?: string;
  uploadState?: GridUploadSlotState;
  showOverlay: boolean;
  remaining: number;
  onOpen: (index: number) => void;
  /** Style bổ sung cho ô (justified: flex-grow + aspect-ratio; masonry: aspect-ratio). */
  style?: CSSProperties;
  /** Báo tỉ lệ intrinsic lên grid — đồng bộ hàng justified khi metadata width/height sai. */
  onNaturalAspect?: (slotIndex: number, aspect: number) => void;
  composeSlotActions?: Props["composeSlotActions"];
  singlePortrait?: boolean;
  canReorder?: boolean;
  dragFrom?: number | null;
  dragSnap?: DragSnapTarget | null;
  onDragFromChange?: (slot: number | null) => void;
  onDragSnapChange?: (snap: DragSnapTarget | null) => void;
};

function ImageGridCell({
  image,
  slotIndex,
  isFirstGroup,
  useButtonCells,
  isUploading,
  uploadProgress,
  slotError,
  uploadState,
  showOverlay,
  remaining,
  onOpen,
  style,
  onNaturalAspect,
  composeSlotActions,
  singlePortrait = false,
  canReorder = false,
  dragFrom = null,
  dragSnap = null,
  onDragFromChange,
  onDragSnapChange,
}: CellProps) {
  const CellTag = useButtonCells ? "button" : "div";

  // Parent (justified/masonry) đã truyền aspect đo được qua `style` — không override
  // local nữa kẻo lệch với aspect-ratio hàng.
  const cellStyle = style;

  const thumb = gridThumbAsset(image, { singlePortrait });
  const thumbSrc = thumb.src;
  const uploadActive = uploadState?.status === "uploading";
  const uploadDone = uploadState?.status === "done";
  const uploadFailed = uploadState?.status === "error";
  const legacyUploading = !uploadState && isUploading;
  const cellDraggable = Boolean(
    canReorder && composeSlotActions?.onReorderImages && thumbSrc,
  );
  const snapHere =
    dragSnap != null &&
    dragSnap.slot === slotIndex &&
    dragFrom != null &&
    insertIndexFromSnap(dragFrom, dragSnap) != null;
  const cellClasses = [
    "image-grid-cell",
    !thumbSrc ? "is-compose-pending" : "",
    composeSlotActions ? "is-compose-editable" : "",
    cellDraggable ? "is-draggable" : "",
    dragFrom === slotIndex ? "is-dragging" : "",
    snapHere ? `is-snap-${dragSnap!.edge} is-snap-axis-${dragSnap!.axis}` : "",
    uploadActive || legacyUploading ? "is-upload-active" : "",
    uploadDone ? "is-upload-done" : "",
    uploadFailed ? "is-upload-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const applySnapFromEvent = (e: DragEvent) => {
    if (dragFrom == null) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const { edge, axis } = snapFromPointer(e, e.currentTarget as HTMLElement);
    const next: DragSnapTarget = { slot: slotIndex, edge, axis };
    if (insertIndexFromSnap(dragFrom, next) == null) {
      if (dragSnap != null) onDragSnapChange?.(null);
      return;
    }
    if (!sameDragSnap(dragSnap, next)) onDragSnapChange?.(next);
  };

  const clearSnapIfNeeded = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragSnap?.slot === slotIndex) onDragSnapChange?.(null);
  };

  const finishDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const raw =
      e.dataTransfer.getData(ALBUM_SLOT_MIME) ||
      e.dataTransfer.getData("text/plain");
    const from = raw !== "" ? Number(raw) : (dragFrom ?? Number.NaN);
    const snap =
      dragSnap?.slot === slotIndex
        ? dragSnap
        : ({
            slot: slotIndex,
            ...snapFromPointer(e, e.currentTarget as HTMLElement),
          } satisfies DragSnapTarget);
    onDragFromChange?.(null);
    onDragSnapChange?.(null);
    if (!Number.isFinite(from)) return;
    const to = insertIndexFromSnap(from, snap);
    if (to == null) return;
    composeSlotActions?.onReorderImages?.(from, to);
  };

  const reorderDnD =
    canReorder && composeSlotActions?.onReorderImages
      ? cellDraggable
        ? {
            draggable: true as const,
            onDragStart: (e: DragEvent) => {
              const t = e.target as HTMLElement;
              if (t.closest(".ph-actions, .ph-del, button")) {
                e.preventDefault();
                return;
              }
              e.stopPropagation();
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData(ALBUM_SLOT_MIME, String(slotIndex));
              e.dataTransfer.setData("text/plain", String(slotIndex));
              onDragFromChange?.(slotIndex);
              onDragSnapChange?.(null);
            },
            onDragOver: applySnapFromEvent,
            onDragLeave: clearSnapIfNeeded,
            onDrop: finishDrop,
            onDragEnd: () => {
              onDragFromChange?.(null);
              onDragSnapChange?.(null);
            },
          }
        : {
            onDragOver: applySnapFromEvent,
            onDragLeave: clearSnapIfNeeded,
            onDrop: finishDrop,
          }
      : null;

  return (
    <CellTag
      {...(useButtonCells
        ? {
            type: "button" as const,
            "aria-label":
              showOverlay
                ? `Xem thêm ${remaining} ảnh, bắt đầu từ ảnh ${slotIndex + 1}`
                : `Xem ảnh ${slotIndex + 1}`,
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              onOpen(slotIndex);
            },
          }
        : { "aria-hidden": true as const })}
      className={cellClasses}
      style={cellStyle}
      {...reorderDnD}
    >
      {snapHere ? (
        <span className="ed-drag-snap" aria-hidden />
      ) : null}
      {thumbSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={thumbSrc}
          srcSet={thumb.srcSet}
          sizes={thumb.srcSet ? thumb.sizes : undefined}
          alt=""
          width={image.width}
          height={image.height}
          loading={isFirstGroup && slotIndex === 0 ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth > 0 && el.naturalHeight > 0) {
              onNaturalAspect?.(
                slotIndex,
                el.naturalWidth / el.naturalHeight,
              );
            }
          }}
          onError={handleGridThumbError}
        />
      ) : null}
      {uploadState ? (
        <>
          {uploadActive || uploadFailed ? (
            <ImageUploadProgressOverlay
              progress={uploadState.progress}
              status={uploadState.status}
              error={uploadState.error}
            />
          ) : null}
          {uploadDone ? (
            <span
              className="image-grid-upload-done"
              role="status"
              aria-label="Đã tải xong"
            >
              <Check size={14} strokeWidth={2.5} aria-hidden />
            </span>
          ) : null}
        </>
      ) : legacyUploading ? (
        <span className="image-grid-uploading" aria-busy="true">
          <Loader2 size={22} strokeWidth={2} className="mc-spin" />
          {typeof uploadProgress === "number" ? (
            <span className="image-grid-uploading-pct">{uploadProgress}%</span>
          ) : null}
        </span>
      ) : null}
      {!uploadState && slotError ? (
        <span className="image-grid-error" role="alert" title={slotError}>
          Upload lỗi
        </span>
      ) : null}
      {showOverlay ? <ImageGridOverlay count={remaining} /> : null}
      {composeSlotActions ? (
        <>
          <div className="ph-actions">
            <button
              type="button"
              className="ph-change"
              title="Đổi ảnh"
              aria-label="Đổi ảnh"
              onClick={(e) => {
                e.stopPropagation();
                composeSlotActions.onPickImage(slotIndex);
              }}
            >
              <ImagePlus size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <button
              type="button"
              className="ph-change ph-paste"
              title="Dán ảnh"
              aria-label="Dán ảnh"
              onClick={(e) => {
                e.stopPropagation();
                composeSlotActions.onPasteImage(slotIndex);
              }}
            >
              <ClipboardPaste size={18} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className="ph-del"
            title="Xoá ảnh"
            aria-label="Xoá ảnh"
            onClick={(e) => {
              e.stopPropagation();
              composeSlotActions.onRemoveImage(slotIndex);
            }}
          >
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        </>
      ) : null}
    </CellTag>
  );
}

export function ImageGrid({
  images,
  isFirstGroup = false,
  uploadingSlots,
  uploadProgressBySlot,
  slotErrors,
  uploadBySlot,
  readOnly = false,
  showAllImages = false,
  timelineLightbox = false,
  albumCarousel = false,
  lightboxIndex: controlledLightboxIndex,
  onLightboxIndexChange,
  lightboxImages: lightboxImagesProp,
  lightboxIndexOffset = 0,
  composeSlotActions,
}: Props) {
  const [internalLightboxIndex, setInternalLightboxIndex] = useState<number | null>(
    null,
  );
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragSnap, setDragSnap] = useState<DragSnapTarget | null>(null);
  const [measuredAspectByIndex, setMeasuredAspectByIndex] = useState<
    Record<number, number>
  >({});
  const lightboxControlled = typeof onLightboxIndexChange === "function";
  const lightboxIndex = lightboxControlled
    ? (controlledLightboxIndex ?? null)
    : internalLightboxIndex;
  const setLightboxIndex = lightboxControlled
    ? onLightboxIndexChange
    : setInternalLightboxIndex;

  const lightboxEnabled = !readOnly || timelineLightbox;

  const imagesAspectKey = useMemo(
    () => images.map((img) => img.id).join("|"),
    [images],
  );
  useEffect(() => {
    setMeasuredAspectByIndex({});
  }, [imagesAspectKey]);

  const reportNaturalAspect = useCallback(
    (slotIndex: number, aspect: number) => {
      setMeasuredAspectByIndex((prev) => {
        const current = prev[slotIndex];
        if (current != null && Math.abs(current - aspect) < 0.0001) return prev;
        return { ...prev, [slotIndex]: aspect };
      });
    },
    [],
  );

  const resolveCellAspect = useCallback(
    (cell: AlbumCell) => measuredAspectByIndex[cell.index] ?? cell.aspect,
    [measuredAspectByIndex],
  );

  const openLightbox = useCallback(
    (index: number) => {
      if (!lightboxEnabled) return;
      setLightboxIndex(index + lightboxIndexOffset);
    },
    [lightboxEnabled, lightboxIndexOffset, setLightboxIndex],
  );

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, [setLightboxIndex]);

  const total = images.length;
  if (total === 0) return null;

  if (albumCarousel && total > 1) {
    return <ImageAlbumCarousel images={images} isFirstGroup={isFirstGroup} />;
  }

  const useButtonCells = lightboxEnabled;
  const canReorder = Boolean(
    composeSlotActions?.onReorderImages && total > 1,
  );

  const lightboxPool = lightboxImagesProp ?? images;

  const layout = resolveAlbumLayout(images, showAllImages);

  const renderCell = (
    slotIndex: number,
    opts?: {
      style?: CSSProperties;
      overlay?: boolean;
      remaining?: number;
      singlePortrait?: boolean;
    },
  ) => {
    const image = images[slotIndex];
    if (!image) return null;
    const uploadState = uploadBySlot?.get(slotIndex);
    return (
      <ImageGridCell
        key={`${image.id}-${slotIndex}`}
        image={image}
        slotIndex={slotIndex}
        isFirstGroup={isFirstGroup}
        useButtonCells={useButtonCells}
        isUploading={uploadingSlots?.has(slotIndex) ?? false}
        uploadProgress={uploadProgressBySlot?.get(slotIndex)}
        slotError={uploadState ? uploadState.error : slotErrors?.get(slotIndex)}
        uploadState={uploadState}
        showOverlay={opts?.overlay ?? false}
        remaining={opts?.remaining ?? 0}
        onOpen={openLightbox}
        style={opts?.style}
        onNaturalAspect={reportNaturalAspect}
        composeSlotActions={composeSlotActions}
        singlePortrait={opts?.singlePortrait}
        canReorder={canReorder}
        dragFrom={dragFrom}
        dragSnap={dragSnap}
        onDragFromChange={setDragFrom}
        onDragSnapChange={setDragSnap}
      />
    );
  };

  let body: ReactNode;

  if (layout.kind === "single") {
    const naturalAspect =
      measuredAspectByIndex[0] ?? layout.cell.aspect;
    body = (
      <div
        className={`image-grid image-grid--single${layout.portrait ? " is-portrait" : ""}`}
        data-count="1"
        style={
          layout.portrait
            ? ({
                ["--media-natural-aspect" as string]: String(naturalAspect),
              } as CSSProperties)
            : undefined
        }
      >
        {renderCell(0, { singlePortrait: layout.portrait })}
      </div>
    );
  } else if (layout.kind === "masonry") {
    const columns = layout.columns;
    body = (
      <div
        className="image-grid image-grid--masonry"
        data-count={total}
        style={{ "--masonry-cols": columns.length } as CSSProperties}
      >
        {columns.map((col, ci) => (
          <div key={`mcol-${ci}`} className="image-grid-mcol">
            {col.map((c: AlbumCell) =>
              renderCell(c.index, {
                style: { aspectRatio: String(resolveCellAspect(c)) },
                overlay: layout.overlaySlotIndex === c.index,
                remaining: layout.remaining,
              }),
            )}
          </div>
        ))}
      </div>
    );
  } else if (layout.kind === "justified") {
    /* Tách lại hàng theo tỉ lệ intrinsic — metadata width/height hay sai khiến
       split 1+2 với ảnh dọc → hàng đơn quá cao. */
    const cellsWithAspect = layout.rows.flat().map((c) => ({
      ...c,
      aspect: resolveCellAspect(c),
    }));
    const justifiedRows = splitJustifiedRows(cellsWithAspect);
    body = (
      <div className="image-grid image-grid-col image-grid--justified" data-count={total}>
        {justifiedRows.map((row, ri) => (
          <div
            key={`jrow-${ri}`}
            className="image-grid-jrow"
            style={{
              aspectRatio: String(justifiedRowCanvasAspect(row)),
            }}
          >
            {row.map((c: AlbumCell) =>
              renderCell(c.index, {
                style: { flexGrow: c.aspect },
                overlay: layout.overlaySlotIndex === c.index,
                remaining: layout.remaining,
              }),
            )}
          </div>
        ))}
      </div>
    );
  } else {
    // square-grid (2-6 ảnh toàn vuông, hoặc >6 chế độ xem, hoặc compose 7+)
    const { layoutCount, remaining, overlaySlotIndex, displayImages } = layout;
    const sqCell = (slotIndex: number) =>
      renderCell(slotIndex, {
        overlay: overlaySlotIndex === slotIndex,
        remaining,
      });
    const sqRow = (indices: number[], three: boolean) => (
      <div className={`image-grid-row${three ? " image-grid-row--3" : ""}`}>
        {indices.map((i) => sqCell(i))}
      </div>
    );

    if (layoutCount === 2) {
      body = (
        <div className="image-grid" data-count="2">
          {sqCell(0)}
          {sqCell(1)}
        </div>
      );
    } else if (layoutCount === 3) {
      body = (
        <div className="image-grid" data-count="3">
          <div className="image-grid-main">{sqCell(0)}</div>
          <div className="image-grid-side">
            {sqCell(1)}
            {sqCell(2)}
          </div>
        </div>
      );
    } else if (layoutCount === 4) {
      body = (
        <div className="image-grid image-grid-col" data-count="4">
          {sqRow([0, 1], false)}
          {sqRow([2, 3], false)}
        </div>
      );
    } else if (layoutCount === 5) {
      body = (
        <div className="image-grid image-grid-col" data-count="5">
          {sqRow([0, 1], false)}
          {sqRow([2, 3, 4], true)}
        </div>
      );
    } else if (layoutCount === 6) {
      body = (
        <div className="image-grid image-grid-col" data-count="6">
          {sqRow([0, 1, 2], true)}
          {sqRow([3, 4, 5], true)}
        </div>
      );
    } else {
      const rows = albumGridComposeRows(displayImages.length);
      body = (
        <div className="image-grid image-grid-col" data-count={layoutCount}>
          {rows.map((indices, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              className={`image-grid-row${
                indices.length === 3 ? " image-grid-row--3" : ""
              }`}
            >
              {indices.map((slotIndex) => sqCell(slotIndex))}
            </div>
          ))}
        </div>
      );
    }
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
