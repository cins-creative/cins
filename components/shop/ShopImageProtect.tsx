"use client";

import { useId, type ImgHTMLAttributes } from "react";

import {
  SHOP_DECOY_SRC,
} from "@/lib/shop/image-protect";

import "./shop-image-protect.css";

type ImgRest = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "className" | "draggable"
>;

type ProtectProps = {
  src: string;
  alt?: string;
  /** false = ảnh sạch (owner / Kho). */
  protect?: boolean;
  /** Chữ phủ — chỉ truyền khi xem lớn. */
  watermarkText?: string | null;
  /** `fill` = ô thumb/card; `contain` = lightbox / preview. */
  fit?: "fill" | "contain";
  className?: string;
  imgClassName?: string;
} & ImgRest;

export function ShopImageDecoy({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={
        className
          ? `shop-img-protect-decoy ${className}`
          : "shop-img-protect-decoy"
      }
      src={SHOP_DECOY_SRC}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
}

export function ShopImageWatermark({ text }: { text: string }) {
  const label = text.trim();
  const rawId = useId().replace(/:/g, "");
  if (!label) return null;
  const patternId = `shop-wm-${rawId}`;
  const cellW = Math.min(520, Math.max(260, label.length * 12 + 72));
  const rowH = 112;
  const cellH = rowH * 2;
  const textProps = {
    textAnchor: "middle" as const,
    fill: "#fff",
    fillOpacity: 0.45,
    stroke: "#111",
    strokeOpacity: 0.15,
    strokeWidth: 1.05,
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif",
  };
  return (
    <div className="shop-img-protect-wm" aria-hidden>
      <svg className="shop-img-protect-wm-svg" aria-hidden>
        <defs>
          <pattern
            id={patternId}
            width={cellW}
            height={cellH}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-22)"
          >
            <text x={cellW / 2} y={rowH / 2} dy="0.32em" {...textProps}>
              {label}
            </text>
            <text x={0} y={rowH + rowH / 2} dy="0.32em" {...textProps}>
              {label}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

export function ShopImageProtect({
  src,
  alt = "",
  protect = true,
  watermarkText = null,
  fit = "fill",
  className,
  imgClassName,
  ...imgRest
}: ProtectProps) {
  if (!protect) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={imgClassName} {...imgRest} />
    );
  }

  const wrapClass = [
    "shop-img-protect",
    fit === "contain" ? "shop-img-protect--contain" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const srcClass = ["shop-img-protect-src", imgClassName]
    .filter(Boolean)
    .join(" ");
  const wm = watermarkText?.trim() || null;

  return (
    <span className={wrapClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={srcClass}
        draggable={false}
        {...imgRest}
      />
      {wm ? <ShopImageWatermark text={wm} /> : null}
      <ShopImageDecoy />
    </span>
  );
}
