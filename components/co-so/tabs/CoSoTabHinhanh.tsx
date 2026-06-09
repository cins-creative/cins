"use client";

import { TruongGalleryJustified } from "@/components/truong/TruongGalleryJustified";
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
        <TruongGalleryJustified
          images={images}
          renderOverlay={(img) => (
            <>
              <div className="gallery-cell-overlay" aria-hidden />
              {img.caption ? (
                <p className="gallery-cell-caption">{img.caption}</p>
              ) : null}
            </>
          )}
        />
      )}
    </>
  );
}
