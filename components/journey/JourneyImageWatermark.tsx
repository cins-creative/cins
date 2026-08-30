"use client";

import {
  watermarkCornerClass,
  watermarkCssVars,
  type WatermarkRenderDto,
} from "@/lib/journey/watermark";
import {
  ShopImageDecoy,
  ShopImageWatermark,
} from "@/components/shop/ShopImageProtect";

import "./journey-watermark.css";

type Props = {
  dto: WatermarkRenderDto;
  /** Thêm decoy chống save — mặc định true khi bảo vệ ảnh bài. */
  protect?: boolean;
  /**
   * Sọc URL mặc định. Layout feed/bài = false (chỉ decoy + chữ ký).
   * Lightbox / picker preview = true.
   */
  showProtectText?: boolean;
  className?: string;
};

/**
 * Overlay watermark ảnh bài (album / bài dài).
 * Sọc URL mặc định chỉ khi `showProtectText` (xem lớn).
 * Logo/chữ ký PNG tùy chỉnh luôn hiện nếu có `dto.src`.
 */
export function JourneyImageWatermark({
  dto,
  protect = true,
  showProtectText = false,
  className,
}: Props) {
  const cornerClass = watermarkCornerClass(dto.corner);
  const style = watermarkCssVars(dto);
  const protectLabel = (dto.protectText ?? "").trim();
  return (
    <>
      {showProtectText && protectLabel ? (
        <ShopImageWatermark text={protectLabel} />
      ) : null}
      {dto.src ? (
        <span
          className={
            "j-wm-overlay " +
            cornerClass +
            (className ? ` ${className}` : "")
          }
          style={style}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="j-wm-overlay-img"
            src={dto.src}
            alt=""
            draggable={false}
          />
        </span>
      ) : null}
      {protect ? <ShopImageDecoy className="j-wm-decoy" /> : null}
    </>
  );
}
