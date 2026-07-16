"use client";

import { SquareRoundCorner } from "lucide-react";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import {
  IMG_LAYOUTS,
  IMG_SLOT_GAP_DEFAULT,
  imgSlotGapLabel,
  imgSlotGapNextHint,
  normalizeImgSlotGap,
  type ImgLayout,
  type ImgSlotGap,
} from "@/lib/editor/image-layout";

type Props = {
  layout: ImgLayout;
  rounded: boolean;
  gap?: ImgSlotGap;
  onChangeLayout: (layout: ImgLayout) => void;
  onToggleRound: () => void;
  onCycleGap: () => void;
};

/** Toolbar chọn layout ảnh + bo góc + gap — dùng chung editor & compose ảnh. */
export function ImageLayoutBar({
  layout,
  rounded,
  gap: gapProp,
  onChangeLayout,
  onToggleRound,
  onCycleGap,
}: Props) {
  const gap = normalizeImgSlotGap(gapProp);
  const gapTitle = `${imgSlotGapLabel(gap)} — bấm để ${imgSlotGapNextHint(gap).toLowerCase()}`;
  return (
    <div className="lay-bar">
      {IMG_LAYOUTS.map((l) => (
          <button
            key={l.k}
            type="button"
            className={`lay-btn${l.k === layout ? " active" : ""}`}
            title={l.name}
            aria-label={l.name}
            onClick={(e) => {
              e.stopPropagation();
              onChangeLayout(l.k);
            }}
          >
            <LayoutThumbIcon layout={l.k} />
          </button>
        ))}
      <span className="lay-sep" />
      <button
        type="button"
        className={`lay-btn round-toggle${rounded ? " active" : ""}`}
        title={rounded ? "Bỏ bo góc" : "Bo góc"}
        aria-label={rounded ? "Bỏ bo góc" : "Bo góc"}
        aria-pressed={rounded ? "true" : "false"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleRound();
        }}
      >
        <SquareRoundCorner size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        className={`lay-btn gap-toggle${gap !== IMG_SLOT_GAP_DEFAULT ? " active" : ""}`}
        data-gap={gap}
        title={gapTitle}
        aria-label={gapTitle}
        onClick={(e) => {
          e.stopPropagation();
          onCycleGap();
        }}
      >
        <span className="lay-gap-val" aria-hidden>
          {gap}
        </span>
      </button>
    </div>
  );
}
