"use client";

import { useEffect, useState } from "react";

import type { Block } from "@/lib/editor/types";
import { PostRiveFileEmbed } from "@/components/journey/PostRiveFileEmbed";
import {
  resolveEmbedIframePeek,
  resolveRiveFileEmbedPeek,
} from "@/lib/journey/post-media";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";

type Props = {
  body?: string | null;
  blocks: ReadonlyArray<Block>;
};

function embedIframeAllow(provider: EmbedProviderId): string | undefined {
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

function embedIframeTitle(provider: EmbedProviderId): string {
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
    case "rive-file":
      return "Rive animation";
    default:
      return "Embedded content";
  }
}

/** Peek embed trên timeline card — iframe Tier 1 hoặc file .riv trên R2. */
export function JourneyCardEmbedPeek({ body, blocks }: Props) {
  const riveFilePeek = resolveRiveFileEmbedPeek(body, blocks);
  const [riveAspectRatio, setRiveAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setRiveAspectRatio(null);
  }, [riveFilePeek?.url]);

  if (riveFilePeek) {
    return (
      <div
        className="preview preview--article-peek jcard-embed-peek"
        data-provider="rive-file"
        data-aspect-ready={riveAspectRatio ? "true" : undefined}
        style={
          riveAspectRatio ? { aspectRatio: String(riveAspectRatio) } : undefined
        }
      >
        <PostRiveFileEmbed
          src={riveFilePeek.url}
          className="jcard-rive-file"
          fit="native"
          onArtboardAspectRatio={setRiveAspectRatio}
        />
      </div>
    );
  }

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
