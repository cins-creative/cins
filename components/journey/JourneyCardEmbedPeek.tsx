"use client";

import { useEffect, useState } from "react";

import type { Block } from "@/lib/editor/types";
import { PostRiveFileEmbed } from "@/components/journey/PostRiveFileEmbed";
import { PostLottieFileEmbed } from "@/components/journey/PostLottieFileEmbed";
import { ViewportGatedEmbed } from "@/components/journey/ViewportGatedEmbed";
import { EmbedInteractionGate } from "@/components/journey/EmbedInteractionGate";
import {
  resolveEmbedIframePeek,
  resolveLottieFileEmbedPeek,
  resolveRiveFileEmbedPeek,
} from "@/lib/journey/post-media";

type Props = {
  body?: string | null;
  blocks: ReadonlyArray<Block>;
};

/** Peek embed trên timeline card — iframe Tier 1 hoặc file .riv/.lottie trên R2. */
export function JourneyCardEmbedPeek({ body, blocks }: Props) {
  const riveFilePeek = resolveRiveFileEmbedPeek(body, blocks);
  const lottieFilePeek = resolveLottieFileEmbedPeek(body, blocks);
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

  if (lottieFilePeek) {
    return (
      <ViewportGatedEmbed
        className="preview preview--article-peek jcard-embed-peek"
        data-provider="lottie-file"
      >
        <PostLottieFileEmbed
          src={lottieFilePeek.url}
          className="jcard-lottie-file"
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
      <EmbedInteractionGate
        provider={peek.provider}
        iframeSrc={peek.iframeSrc}
      />
    </ViewportGatedEmbed>
  );
}
