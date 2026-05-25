"use client";

import Image from "next/image";

import {
  isMonThiPlaceholderId,
  monThiPlaceholderInitials,
  monThiPlaceholderStyle,
  resolveMonThiThumbnailUrl,
  type MonThiThumbProps,
} from "@/lib/truong/mon-thi-thumbnail";

export function MonThiThumb({
  ten,
  loai = null,
  ma = null,
  thumbnail_id = null,
  thumbnail_url = null,
  className = "",
}: MonThiThumbProps) {
  const url =
    thumbnail_url?.trim() || resolveMonThiThumbnailUrl(thumbnail_id);
  const style = monThiPlaceholderStyle(loai);
  const initials = monThiPlaceholderInitials(ten, ma);
  const showPlaceholder = !url;

  const rootClass = `mon-thi-thumb${className ? ` ${className}` : ""}`;

  if (!showPlaceholder && url) {
    return (
      <span className={`${rootClass} mon-thi-thumb--img`}>
        <Image
          src={url}
          alt=""
          width={72}
          height={72}
          className="mon-thi-thumb-img"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`${rootClass} mon-thi-thumb--placeholder`}
      style={{
        background: style.bg,
        color: style.fg,
        ["--mon-thi-accent" as string]: style.accent,
      }}
      aria-hidden
    >
      <span className="mon-thi-thumb-initials">{initials}</span>
    </span>
  );
}
