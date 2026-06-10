"use client";

import { TruongHinhAnhGallery } from "@/components/truong/TruongHinhAnhGallery";
import { labelHinhAnhLoai } from "@/lib/truong/hinh-anh";
import type { TruongHinhAnh } from "@/lib/truong/types";

type Props = { images: TruongHinhAnh[] };

export function CoSoTabHinhanh({ images }: Props) {
  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">04</span>
        <h2 className="sec-title">Hình ảnh</h2>
      </div>
      {images.length === 0 ? (
        <p className="tdh-placeholder">
          Gallery sẽ hiển thị khi ảnh được đăng từ cơ sở.
        </p>
      ) : (
        <TruongHinhAnhGallery
          images={images}
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
