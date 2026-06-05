import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  priority?: boolean;
  isVideo?: boolean;
  videoProcessing?: boolean;
};

/** Thumbnail gallery — ảnh CF, Bunny thumb, hoặc placeholder video. */
export function GalleryItemVisual({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  priority,
  isVideo,
  videoProcessing,
}: Props) {
  if (src) {
    return (
      <JourneyCoverImage
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        priority={priority}
      />
    );
  }

  if (isVideo) {
    return (
      <span className="j-gallery-video-ph" aria-hidden>
        {videoProcessing ? "Đang xử lý" : "Video"}
      </span>
    );
  }

  return null;
}

export function GalleryVideoPlayBadge() {
  return (
    <span className="j-g-play" aria-hidden>
      ▶
    </span>
  );
}
