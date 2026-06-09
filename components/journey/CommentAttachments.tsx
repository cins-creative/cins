"use client";

import { useState } from "react";

import {
  gridLightboxSrc,
  gridThumbSrc,
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
} from "@/lib/journey/image-grid";

type Props = {
  imageIds: ReadonlyArray<string>;
};

function CommentAttachmentItem({ image }: { image: GridImage }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  return (
    <a
      className="post-comments-attachment"
      href={gridLightboxSrc(image)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gridThumbSrc(image)}
        alt=""
        loading="lazy"
        decoding="async"
        width={dims?.w}
        height={dims?.h}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth > 0 && el.naturalHeight > 0) {
            setDims({ w: el.naturalWidth, h: el.naturalHeight });
          }
        }}
      />
    </a>
  );
}

export function CommentAttachments({ imageIds }: Props) {
  if (imageIds.length === 0) return null;

  return (
    <div
      className={`post-comments-attachments post-comments-attachments--${Math.min(imageIds.length, 4)}`}
    >
      {imageIds.map((id) => (
        <CommentAttachmentItem
          key={id}
          image={{
            id,
            width: GRID_IMAGE_DEFAULT_WIDTH,
            height: GRID_IMAGE_DEFAULT_HEIGHT,
          }}
        />
      ))}
    </div>
  );
}
