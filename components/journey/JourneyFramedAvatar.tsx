"use client";

import type { ReactNode } from "react";

import {
  avatarFrameClass,
  avatarFrameStyle,
  type AvatarFrameDto,
} from "@/lib/journey/avatar-frame";

import "./journey-avatar-frame.css";

type Props = {
  frame?: AvatarFrameDto | null;
  /** Cỡ hộp avatar (px) — scale expand/viền. */
  sizePx: number;
  className?: string;
  children: ReactNode;
  "aria-hidden"?: boolean | "true" | "false";
};

/**
 * Bọc logo/avatar tròn (org-chip, friend card, …) với khung `avatarFrame`.
 */
export function JourneyFramedAvatar({
  frame = null,
  sizePx,
  className,
  children,
  "aria-hidden": ariaHidden,
}: Props) {
  const frameCls = avatarFrameClass(frame);
  const frameVars = avatarFrameStyle(frame, { sizePx });
  return (
    <span
      className={[className, frameCls].filter(Boolean).join(" ")}
      style={frameVars}
      aria-hidden={ariaHidden}
    >
      {children}
      {frame?.overlayImageUrl ? (
        <span className="j-avf-overlay" aria-hidden />
      ) : null}
    </span>
  );
}
