"use client";

import { SquareRoundCorner } from "lucide-react";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import {
  IMG_LAYOUTS,
  type ImgLayout,
} from "@/lib/editor/image-layout";

type Props = {
  layout: ImgLayout;
  rounded: boolean;
  onChangeLayout: (layout: ImgLayout) => void;
  onToggleRound: () => void;
};

/** Toolbar chọn layout ảnh + bo góc — dùng chung editor & compose ảnh. */
export function ImageLayoutBar({
  layout,
  rounded,
  onChangeLayout,
  onToggleRound,
}: Props) {
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
    </div>
  );
}
