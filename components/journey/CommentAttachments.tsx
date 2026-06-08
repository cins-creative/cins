"use client";

import {
  gridLightboxSrc,
  gridThumbSrc,
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
} from "@/lib/journey/image-grid";

type Props = {
  imageIds: ReadonlyArray<string>;
};

export function CommentAttachments({ imageIds }: Props) {
  if (imageIds.length === 0) return null;

  return (
    <div
      className={`post-comments-attachments post-comments-attachments--${Math.min(imageIds.length, 4)}`}
    >
      {imageIds.map((id) => {
        const image = {
          id,
          width: GRID_IMAGE_DEFAULT_WIDTH,
          height: GRID_IMAGE_DEFAULT_HEIGHT,
        };
        return (
          <a
            key={id}
            className="post-comments-attachment"
            href={gridLightboxSrc(image)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gridThumbSrc(image)} alt="" loading="lazy" decoding="async" />
          </a>
        );
      })}
    </div>
  );
}
