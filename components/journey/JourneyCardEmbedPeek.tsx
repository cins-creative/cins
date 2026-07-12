"use client";

import { useEffect, useState } from "react";

import type { Block } from "@/lib/editor/types";
import { PostRiveFileEmbed } from "@/components/journey/PostRiveFileEmbed";
import { ViewportGatedEmbed } from "@/components/journey/ViewportGatedEmbed";
import {
  resolveEmbedIframePeek,
  resolveRiveFileEmbedPeek,
} from "@/lib/journey/post-media";
import {
  embedIframeAllowAttr,
  embedIframeTitle,
  type EmbedProviderId,
} from "@/lib/editor/embed-providers";

type Props = {
  body?: string | null;
  blocks: ReadonlyArray<Block>;
};

function embedIframeAllow(provider: EmbedProviderId): string | undefined {
  return embedIframeAllowAttr(provider);
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
      <ViewportGatedEmbed
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
      </ViewportGatedEmbed>
    );
  }

  const peek = resolveEmbedIframePeek(body, blocks);
  if (!peek) return null;

  return (
    <ViewportGatedEmbed
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
    </ViewportGatedEmbed>
  );
}
