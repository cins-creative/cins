import { bunnyIframeSrc, classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { VideoProcessingPlaceholder } from "@/components/journey/VideoProcessingPlaceholder";

type Props = {
  url: string;
  title: string;
  processing?: boolean;
};

function extractYouTubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\/+/, "").split("/")[0];
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
    if (m) return m[2];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!u.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
  const m = u.pathname.match(/\/(\d+)/);
  return m?.[1] ?? null;
}

/**
 * Video inline trên milestone card — Bunny Stream, YouTube, Vimeo.
 */
export function MilestoneVideoEmbed({ url, title, processing = false }: Props) {
  if (processing) {
    return <VideoProcessingPlaceholder />;
  }

  const bunny = classifyBunnyVideoUrl(url);
  if (bunny) {
    return (
      <div
        className="b-embed b-embed-ro is-iframe j-m-video-embed"
        data-provider="bunny"
      >
        <iframe
          src={bunnyIframeSrc(bunny)}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return (
      <div
        className="b-embed b-embed-ro is-iframe j-m-video-embed"
        data-provider="youtube"
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return (
      <div
        className="b-embed b-embed-ro is-iframe j-m-video-embed"
        data-provider="vimeo"
      >
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
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
