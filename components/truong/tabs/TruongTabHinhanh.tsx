"use client";

import {
  TruongHinhAnhDeleteBtn,
  TruongHinhAnhUploadZone,
} from "@/components/truong/inline/TruongHinhAnhEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongGalleryJustified } from "@/components/truong/TruongGalleryJustified";
import type { TruongHinhAnh } from "@/lib/truong/types";

type Props = { images: TruongHinhAnh[] };

export function TruongTabHinhanh({ images: imagesProp }: Props) {
  const ctx = useTruongInlineEdit();
  const images = ctx?.hinhanh ?? imagesProp;

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">03</span>
        <h2 className="sec-title">Hình ảnh trường</h2>
      </div>
      <TruongHinhAnhUploadZone />
      {images.length === 0 ? (
        <p className="tdh-placeholder">
          Gallery sẽ hiển thị khi ảnh được đăng từ tổ chức.
        </p>
      ) : (
        <TruongGalleryJustified
          images={images}
          renderOverlay={(img) => (
            <>
              <div className="gallery-cell-overlay" aria-hidden />
              {img.caption ? (
                <p className="gallery-cell-caption">{img.caption}</p>
              ) : null}
              <TruongHinhAnhDeleteBtn photoId={img.id} />
            </>
          )}
        />
      )}
    </>
  );
}
