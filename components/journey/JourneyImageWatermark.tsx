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
  className?: string;
};

/**
 * Overlay watermark ảnh bài (album / bài dài).
 * Mặc định: sọc URL (cùng ShopImageWatermark loại hàng).
 * Logo PNG tùy chỉnh (nếu có) nằm trên sọc.
 */
export function JourneyImageWatermark({
  dto,
  protect = true,
  className,
}: Props) {
  const cornerClass = watermarkCornerClass(dto.corner);
  const style = watermarkCssVars(dto);
  return (
    <>
      {(dto.protectText ?? "").trim() ? (
        <ShopImageWatermark text={dto.protectText} />
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
