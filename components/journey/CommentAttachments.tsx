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

function CommentAttachmentItem({
  image,
  eager,
}: {
  image: GridImage;
  eager?: boolean;
}) {
  const [aspect, setAspect] = useState<string | undefined>(undefined);

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
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        width={image.width}
        height={image.height}
        style={aspect ? { aspectRatio: aspect } : undefined}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth > 0 && el.naturalHeight > 0) {
            setAspect(`${el.naturalWidth} / ${el.naturalHeight}`);
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
      {imageIds.map((idOrUrl) => {
        const isRemote =
          idOrUrl.startsWith("http://") || idOrUrl.startsWith("https://");
        return (
          <CommentAttachmentItem
            key={idOrUrl}
            eager={isRemote}
            image={{
              id: isRemote ? "preview" : idOrUrl,
              width: GRID_IMAGE_DEFAULT_WIDTH,
              height: GRID_IMAGE_DEFAULT_HEIGHT,
              ...(isRemote ? { previewSrc: idOrUrl } : {}),
            }}
          />
        );
      })}
    </div>
  );
}
