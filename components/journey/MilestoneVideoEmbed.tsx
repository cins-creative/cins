import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";
import { buildVideoIframeSrc } from "@/lib/journey/video-embed";

type Props = {
  url: string;
  title: string;
  processing?: boolean;
  /** Phát ngay khi embed mount (inline card). */
  autoplay?: boolean;
  bunnyVideoId?: string | null;
};

/**
 * Video inline trên milestone card — Bunny Stream, YouTube, Vimeo.
 */
export function MilestoneVideoEmbed({
  url,
  title,
  processing = false,
  autoplay = false,
  bunnyVideoId = null,
}: Props) {
  if (processing) {
    return <VideoProcessingPlaceholder />;
  }

  const iframeSrc = buildVideoIframeSrc(url, { autoplay, bunnyVideoId });
  if (iframeSrc) {
    return (
      <div
        className="b-embed b-embed-ro is-iframe j-m-video-embed"
        data-provider="video"
      >
        <iframe
          src={iframeSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading={autoplay ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <div className="preview-inner j-m-video-fallback">
      <a href={url} target="_blank" rel="noopener noreferrer">
        Mở video
      </a>
    </div>
  );
}
