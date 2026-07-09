"use client";

import type { Block } from "@/lib/editor/types";
import type { Tier1EmbedPlatformId } from "@/lib/editor/embed-providers";
import { resolveEmbedIframePeek } from "@/lib/journey/post-media";

type Props = {
  body?: string | null;
  blocks: ReadonlyArray<Block>;
};

function embedIframeAllow(provider: Tier1EmbedPlatformId): string | undefined {
  if (provider === "sketchfab") {
    return "autoplay; fullscreen; xr-spatial-tracking";
  }
  if (provider === "rive") {
    return "autoplay; encrypted-media; clipboard-write";
  }
  if (provider === "youtube" || provider === "vimeo") {
    return "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  }
  return "fullscreen";
}

function embedIframeTitle(provider: Tier1EmbedPlatformId): string {
  switch (provider) {
    case "youtube":
      return "YouTube video player";
    case "vimeo":
      return "Vimeo video player";
    case "figma":
      return "Figma file";
    case "framer":
      return "Framer prototype";
    case "sketchfab":
      return "Sketchfab 3D model";
    case "rive":
      return "Rive animation";
    default:
      return "Embedded content";
  }
}

/** Peek embed Tier 1 trên timeline card — cùng pattern iframe đơn giản như editor compose. */
export function JourneyCardEmbedPeek({ body, blocks }: Props) {
  const peek = resolveEmbedIframePeek(body, blocks);
  if (!peek) return null;

  return (
    <div
      className="preview preview--article-peek jcard-embed-peek"
      data-provider={peek.provider}
    >
      <iframe
        src={peek.iframeSrc}
        title={embedIframeTitle(peek.provider)}
        allow={embedIframeAllow(peek.provider)}
        referrerPolicy={
          peek.provider === "youtube" || peek.provider === "vimeo"
            ? "strict-origin-when-cross-origin"
            : undefined
        }
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
