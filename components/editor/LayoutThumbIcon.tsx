import type { ReactNode } from "react";

import type { ImgLayout } from "@/lib/editor/image-layout";

const RX = 0.65;

function R({
  x,
  y,
  w,
  h,
  o = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Opacity — dùng cho khung ngoài (boxed). */
  o?: number;
}) {
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

/** Pictogram nhỏ khớp cấu trúc grid thật của từng layout ảnh. */
export function LayoutThumbIcon({ layout }: { layout: ImgLayout }) {
  return (
    <svg
      className="lay-thumb"
      viewBox="0 0 18 14"
      width={18}
      height={14}
      aria-hidden
    >
      {THUMBS[layout]}
    </svg>
  );
}

const THUMBS: Record<ImgLayout, ReactNode> = {
  full: (
    <>
      <R x={1} y={1} w={16} h={5.4} />
      <R x={1} y={7.6} w={16} h={5.4} />
    </>
  ),
  masonry: (
    <>
      <R x={1} y={1} w={4.6} h={5} />
      <R x={1} y={7} w={4.6} h={6} />
      <R x={6.7} y={1} w={4.6} h={7} />
      <R x={6.7} y={9.4} w={4.6} h={3.6} />
      <R x={12.4} y={1} w={4.6} h={4} />
      <R x={12.4} y={6} w={4.6} h={7} />
    </>
  ),
  justified: (
    <>
      <R x={1} y={1} w={7} h={5.4} />
      <R x={9.4} y={1} w={7.6} h={5.4} />
      <R x={1} y={7.6} w={4.8} h={5.4} />
      <R x={7.2} y={7.6} w={3.8} h={5.4} />
      <R x={12.4} y={7.6} w={4.6} h={5.4} />
    </>
  ),
  duo: (
    <>
      <R x={1} y={1} w={7.5} h={12} />
      <R x={9.5} y={1} w={7.5} h={12} />
    </>
  ),
  grid2: (
    <>
      <R x={1} y={1} w={7.5} h={3.4} />
      <R x={9.5} y={1} w={7.5} h={3.4} />
      <R x={1} y={5.3} w={7.5} h={3.4} />
      <R x={9.5} y={5.3} w={7.5} h={3.4} />
      <R x={1} y={9.6} w={7.5} h={3.4} />
      <R x={9.5} y={9.6} w={7.5} h={3.4} />
    </>
  ),
  grid3: (
    <>
      <R x={1} y={1} w={4.6} h={5.4} />
      <R x={6.7} y={1} w={4.6} h={5.4} />
      <R x={12.4} y={1} w={4.6} h={5.4} />
      <R x={1} y={7.6} w={4.6} h={5.4} />
      <R x={6.7} y={7.6} w={4.6} h={5.4} />
      <R x={12.4} y={7.6} w={4.6} h={5.4} />
    </>
  ),
  grid4: (
    <>
      <R x={1} y={1} w={7.5} h={5.4} />
      <R x={9.5} y={1} w={7.5} h={5.4} />
      <R x={1} y={7.6} w={7.5} h={5.4} />
      <R x={9.5} y={7.6} w={7.5} h={5.4} />
    </>
  ),
  hero: (
    <>
      <R x={1} y={1} w={16} h={7.5} />
      <R x={1} y={9.4} w={4.9} h={3.6} />
      <R x={6.55} y={9.4} w={4.9} h={3.6} />
      <R x={12.1} y={9.4} w={4.9} h={3.6} />
    </>
  ),
};
