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
  full: <R x={1} y={1} w={16} h={12} />,
  boxed: (
    <>
      <R x={1} y={1} w={16} h={12} o={0.28} />
      <R x={4.5} y={3} w={9} h={8} />
    </>
  ),
  stack: (
    <>
      <R x={1} y={1} w={16} h={3.2} />
      <R x={1} y={5.4} w={16} h={3.2} />
      <R x={1} y={9.8} w={16} h={3.2} />
    </>
  ),
  duo: (
    <>
      <R x={1} y={1} w={7.2} h={12} />
      <R x={9.8} y={1} w={7.2} h={12} />
    </>
  ),
  "duo-stack": (
    <>
      <R x={1} y={1} w={7.2} h={5.2} />
      <R x={9.8} y={1} w={7.2} h={5.2} />
      <R x={1} y={7.8} w={7.2} h={5.2} />
      <R x={9.8} y={7.8} w={7.2} h={5.2} />
    </>
  ),
  row3: (
    <>
      <R x={1} y={1} w={4.6} h={12} />
      <R x={6.7} y={1} w={4.6} h={12} />
      <R x={12.4} y={1} w={4.6} h={12} />
    </>
  ),
  trio: (
    <>
      <R x={1} y={1} w={9.5} h={12} />
      <R x={11.5} y={1} w={5.5} h={5.5} />
      <R x={11.5} y={7.5} w={5.5} h={5.5} />
    </>
  ),
  "big-right": (
    <>
      <R x={1} y={1} w={5.2} h={5.2} />
      <R x={1} y={7.8} w={5.2} h={5.2} />
      <R x={7.2} y={1} w={9.8} h={12} />
    </>
  ),
  grid4: (
    <>
      <R x={1} y={1} w={7.2} h={5.2} />
      <R x={9.8} y={1} w={7.2} h={5.2} />
      <R x={1} y={7.8} w={7.2} h={5.2} />
      <R x={9.8} y={7.8} w={7.2} h={5.2} />
    </>
  ),
  strip5: (
    <>
      <R x={1} y={1} w={2.6} h={12} />
      <R x={4.2} y={1} w={2.6} h={12} />
      <R x={7.4} y={1} w={2.6} h={12} />
      <R x={10.6} y={1} w={2.6} h={12} />
      <R x={13.8} y={1} w={3.2} h={12} />
    </>
  ),
  grid6: (
    <>
      <R x={1} y={1} w={4.6} h={5.2} />
      <R x={6.7} y={1} w={4.6} h={5.2} />
      <R x={12.4} y={1} w={4.6} h={5.2} />
      <R x={1} y={7.8} w={4.6} h={5.2} />
      <R x={6.7} y={7.8} w={4.6} h={5.2} />
      <R x={12.4} y={7.8} w={4.6} h={5.2} />
    </>
  ),
  grid9: (
    <>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <R
            key={`${row}-${col}`}
            x={1 + col * 5.5}
            y={1 + row * 4}
            w={4.6}
            h={3.2}
          />
        )),
      )}
    </>
  ),
  mosaic: (
    <>
      <R x={1} y={1} w={9.5} h={7.2} />
      <R x={11.5} y={1} w={5.5} h={3.2} />
      <R x={11.5} y={5.2} w={5.5} h={3} />
      <R x={1} y={9.2} w={16} h={3.8} />
    </>
  ),
};
