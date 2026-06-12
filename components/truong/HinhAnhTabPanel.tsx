"use client";

import { TruongHinhAnhManageZone } from "@/components/truong/inline/TruongHinhAnhManageModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongHinhAnhGallery } from "@/components/truong/TruongHinhAnhGallery";
import { labelHinhAnhLoai } from "@/lib/truong/hinh-anh";
import type { TruongHinhAnh } from "@/lib/truong/types";

type Props = {
  images: TruongHinhAnh[];
  sectionNum: string;
  sectionTitle: string;
  emptyHint: string;
};

export function HinhAnhTabPanel({
  images: imagesProp,
  sectionNum,
  sectionTitle,
  emptyHint,
}: Props) {
  const ctx = useTruongInlineEdit();
  const images = ctx?.hinhanh ?? imagesProp;
  const manageToolbar = ctx?.isEditing ? (
    <TruongHinhAnhManageZone compact />
  ) : null;

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">{sectionNum}</span>
        <h2 className="sec-title">{sectionTitle}</h2>
      </div>
      {images.length === 0 && !ctx?.isEditing ? (
        <p className="tdh-placeholder">{emptyHint}</p>
      ) : (
        <TruongHinhAnhGallery
          images={images}
          toolbarLeading={manageToolbar}
          renderOverlay={(img) => (
            <>
              <div className="gallery-cell-overlay" aria-hidden />
              <div className="tdh-hinhanh-cell-meta">
                <span className="tdh-hinhanh-loai-badge">
                  {labelHinhAnhLoai(img.loai)}
                </span>
                {img.caption ? (
                  <p className="gallery-cell-caption">{img.caption}</p>
                ) : null}
              </div>
            </>
          )}
        />
      )}
    </>
  );
}
