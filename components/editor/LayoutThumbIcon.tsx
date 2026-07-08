import type { ReactNode } from "react";

import type { ImgLayout } from "@/lib/editor/image-layout";

const RX = 0.65;
const STROKE_W = 1.25;

type ThumbVariant = "fill" | "stroke";

function R({
  x,
  y,
  w,
  h,
  o = 1,
  variant = "fill",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Opacity — dùng cho khung ngoài (boxed). */
  o?: number;
  variant?: ThumbVariant;
}) {
  if (variant === "stroke") {
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={RX}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_W}
      />
    );
  }

  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={RX}
      fill="currentColor"
      fillOpacity={o}
    />
  );
}

function masonry2GalleryThumb(): ReactNode {
  const cell = (x: number, y: number, w: number, h: number) => (
    <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={1} fill="none" />
  );

  return (
    <>
      {cell(3, 3, 7, 6)}
      {cell(3, 13, 7, 8)}
      {cell(14, 3, 7, 10)}
      {cell(14, 15, 7, 6)}
    </>
  );
}

function buildThumbs(variant: ThumbVariant): Record<ImgLayout, ReactNode> {
  const T = (p: Omit<Parameters<typeof R>[0], "variant">) => (
    <R {...p} variant={variant} />
  );

  return {
    full: (
      <>
        <T x={1} y={1} w={16} h={5.4} />
        <T x={1} y={7.6} w={16} h={5.4} />
      </>
    ),
    masonry: (
      <>
        <T x={1} y={1} w={4.6} h={5} />
        <T x={1} y={7} w={4.6} h={6} />
        <T x={6.7} y={1} w={4.6} h={7} />
        <T x={6.7} y={9.4} w={4.6} h={3.6} />
        <T x={12.4} y={1} w={4.6} h={4} />
        <T x={12.4} y={6} w={4.6} h={7} />
      </>
    ),
    justified: (
      <>
        <T x={1} y={1} w={7} h={5.4} />
        <T x={9.4} y={1} w={7.6} h={5.4} />
        <T x={1} y={7.6} w={4.8} h={5.4} />
        <T x={7.2} y={7.6} w={3.8} h={5.4} />
        <T x={12.4} y={7.6} w={4.6} h={5.4} />
      </>
    ),
    /* duo: 1 hàng 2 ảnh cạnh nhau (4:5). */
    duo: (
      <>
        <T x={1} y={2} w={7.5} h={9.375} />
        <T x={9.5} y={2} w={7.5} h={9.375} />
      </>
    ),
    /* grid2: 1 hàng 3 ảnh ngang (vuông 1:1). */
    grid2: (
      <>
        <T x={1} y={3} w={4.6} h={4.6} />
        <T x={6.7} y={3} w={4.6} h={4.6} />
        <T x={12.4} y={3} w={4.6} h={4.6} />
      </>
    ),
    /* grid3: 3 cột, ô vuông 1:1. */
    grid3: (
      <>
        <T x={1} y={1} w={4.6} h={4.6} />
        <T x={6.7} y={1} w={4.6} h={4.6} />
        <T x={12.4} y={1} w={4.6} h={4.6} />
        <T x={1} y={6.6} w={4.6} h={4.6} />
        <T x={6.7} y={6.6} w={4.6} h={4.6} />
        <T x={12.4} y={6.6} w={4.6} h={4.6} />
      </>
    ),
    /* grid4: lưới 2×2, ô vuông 1:1. */
    grid4: (
      <>
        <T x={3} y={1} w={5.5} h={5.5} />
        <T x={9.5} y={1} w={5.5} h={5.5} />
        <T x={3} y={7.5} w={5.5} h={5.5} />
        <T x={9.5} y={7.5} w={5.5} h={5.5} />
      </>
    ),
    /* hero: ảnh đầu 16:9 + dải vuông 1:1 bên dưới. */
    hero: (
      <>
        <T x={1} y={1} w={16} h={9} />
        <T x={1} y={10} w={4} h={4} />
        <T x={6} y={10} w={4} h={4} />
        <T x={11} y={10} w={4} h={4} />
      </>
    ),
  };
}

const FILL_THUMBS = buildThumbs("fill");
const STROKE_THUMBS = buildThumbs("stroke");

/** Pictogram nhỏ khớp cấu trúc grid thật của từng layout ảnh. */
export function LayoutThumbIcon({
  layout,
  variant = "fill",
  size,
  masonryColumns = 3,
}: {
  layout: ImgLayout;
  /** `stroke` — viền (toolbar gallery); mặc định `fill` (editor layout bar). */
  variant?: ThumbVariant;
  /** Chiều rộng px — giữ tỉ lệ 18:14 (vd. 15 khớp Lucide cạnh). */
  size?: number;
  /** Chỉ `masonry`: 2 cột gọn (toolbar gallery) · 3 cột (editor). */
  masonryColumns?: 2 | 3;
}) {
  const isMasonry2 = layout === "masonry" && masonryColumns === 2;
  const thumbs = variant === "fill" ? FILL_THUMBS : STROKE_THUMBS;
  const width = size ?? (isMasonry2 ? 24 : 18);
  const height = isMasonry2
    ? (size ?? 24)
    : size
      ? (size * 14) / 18
      : 14;

  if (isMasonry2) {
    return (
      <svg
        className="lay-thumb"
        viewBox="0 0 24 24"
        width={size ?? 15}
        height={size ?? 15}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {masonry2GalleryThumb()}
      </svg>
    );
  }

  const content = thumbs[layout];

  return (
    <svg
      className="lay-thumb"
      viewBox="0 0 18 14"
      width={width}
      height={height}
      aria-hidden
    >
      {content}
    </svg>
  );
}
