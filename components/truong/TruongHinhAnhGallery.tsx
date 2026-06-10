"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ImageLightbox } from "@/components/journey/ImageLightbox";
import { TruongGalleryJustified } from "@/components/truong/TruongGalleryJustified";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
} from "@/lib/journey/image-grid";
import {
  countHinhAnhByLoai,
  HINH_ANH_LOAI_OPTIONS,
  normalizeHinhAnhLoai,
  type HinhAnhLoai,
} from "@/lib/truong/hinh-anh";
import type { TruongHinhAnh } from "@/lib/truong/types";

export type HinhAnhGalleryFilter = "all" | HinhAnhLoai;

type Props = {
  images: TruongHinhAnh[];
  renderOverlay?: (img: TruongHinhAnh) => ReactNode;
  emptyMessage?: string;
};

function hinhAnhToGridImage(img: TruongHinhAnh): GridImage {
  return {
    id: img.cloudflare_id,
    width: GRID_IMAGE_DEFAULT_WIDTH,
    height: GRID_IMAGE_DEFAULT_HEIGHT,
    previewSrc: img.src?.trim() || undefined,
  };
}

export function TruongHinhAnhGallery({
  images,
  renderOverlay,
  emptyMessage = "Chưa có ảnh trong mục này.",
}: Props) {
  const [filter, setFilter] = useState<HinhAnhGalleryFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const loaiCounts = useMemo(() => countHinhAnhByLoai(images), [images]);

  const filterOptions = useMemo(
    () =>
      HINH_ANH_LOAI_OPTIONS.filter(
        (opt) => (loaiCounts.get(opt.value) ?? 0) > 0,
      ),
    [loaiCounts],
  );

  const showFilters = images.length > 0 && filterOptions.length > 0;

  const activeLabel =
    filter === "all"
      ? "Tất cả"
      : (filterOptions.find((opt) => opt.value === filter)?.label ?? "Tất cả");

  const activeCount =
    filter === "all" ? images.length : (loaiCounts.get(filter) ?? 0);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  const filteredImages = useMemo(() => {
    if (filter === "all") return images;
    return images.filter(
      (img) => normalizeHinhAnhLoai(img.loai) === filter,
    );
  }, [images, filter]);

  const lightboxImages = useMemo(
    () => filteredImages.map(hinhAnhToGridImage),
    [filteredImages],
  );

  if (!images.length) return null;

  return (
    <>
      {showFilters ? (
        <div className="tdh-hinhanh-filter-row">
          <div
            className={`j-tlb-filter${filterOpen ? " is-open" : ""}`}
            ref={filterRef}
          >
            <button
              type="button"
              className="j-tlb-dd-btn"
              aria-expanded={filterOpen}
              aria-haspopup="menu"
              onClick={() => setFilterOpen((v) => !v)}
            >
              {activeLabel}
              <span className="j-tlb-dd-count">{activeCount}</span>
              <ChevronDown size={14} className="j-tlb-dd-caret" aria-hidden />
            </button>
            <div className="j-tlb-dd-menu" role="menu">
              <div className="j-dd-section-label">Loại hình ảnh</div>
              <button
                type="button"
                role="menuitem"
                className={
                  "j-dd-opt j-dd-opt-main" + (filter === "all" ? " is-active" : "")
                }
                onClick={() => {
                  setFilter("all");
                  setFilterOpen(false);
                }}
              >
                <span className="j-dd-lbl">Tất cả</span>
                <span className="j-dd-n">{images.length}</span>
              </button>
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  className={
                    "j-dd-opt j-dd-opt-main" +
                    (filter === opt.value ? " is-active" : "")
                  }
                  onClick={() => {
                    setFilter(opt.value);
                    setFilterOpen(false);
                  }}
                >
                  <span className="j-dd-lbl">{opt.label}</span>
                  <span className="j-dd-n">{loaiCounts.get(opt.value) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {filteredImages.length === 0 ? (
        <p className="tdh-placeholder tdh-hinhanh-filter-empty">{emptyMessage}</p>
      ) : (
        <TruongGalleryJustified
          images={filteredImages}
          onImageClick={(img) => {
            const idx = filteredImages.findIndex((x) => x.id === img.id);
            if (idx >= 0) setLightboxIndex(idx);
          }}
          renderOverlay={renderOverlay}
        />
      )}

      {lightboxIndex != null && lightboxImages.length > 0 ? (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </>
  );
}
