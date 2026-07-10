"use client";

import { useEffect, useState } from "react";

import { ensureRiveRuntime } from "@/lib/cins/rive-runtime";
import {
  type RiveEmbedFit,
  useInteractiveRiveEmbed,
} from "@/lib/cins/rive-embed";

if (typeof window !== "undefined") {
  ensureRiveRuntime();
}

type Props = {
  src: string;
  className?: string;
  /**
   * `native` — đọc artboard .riv, khung theo tỉ lệ gốc + Contain (timeline card).
   * `contain` / `cover` — fit cố định trong khung cha.
   */
  fit?: RiveEmbedFit;
  onArtboardAspectRatio?: (ratio: number) => void;
};

export function PostRiveFileEmbed({
  src,
  className = "",
  fit = "contain",
  onArtboardAspectRatio,
}: Props) {
  const [localAspectRatio, setLocalAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setLocalAspectRatio(null);
  }, [src]);

  const { RiveComponent } = useInteractiveRiveEmbed(src, {
    fit,
    onArtboardAspectRatio: (ratio) => {
      setLocalAspectRatio(ratio);
      onArtboardAspectRatio?.(ratio);
    },
  });

  const aspectRatio =
    fit === "native" && localAspectRatio && !onArtboardAspectRatio
      ? localAspectRatio
      : null;

  return (
    <div
      className={`b-embed b-embed-ro is-rive-file${className ? ` ${className}` : ""}`}
      data-provider="rive-file"
      data-aspect-ready={aspectRatio ? "true" : undefined}
      style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}
    >
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
