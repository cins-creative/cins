"use client";

import type { CSSProperties, ReactNode } from "react";

import { useOffscreenMedia } from "@/lib/journey/use-offscreen-media";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Giữ chỗ khi unload — tránh nhảy layout. */
  "data-provider"?: string;
  "data-aspect-ready"?: string;
};

/**
 * Chỉ mount iframe/player khi còn trong viewport; scroll ra → unmount để dừng
 * audio/WebGL và giải phóng cache (YouTube, Sketchfab, Figma, …).
 */
export function ViewportGatedEmbed({
  children,
  className,
  style,
  "data-provider": dataProvider,
  "data-aspect-ready": dataAspectReady,
}: Props) {
  const { ref, inView } = useOffscreenMedia<HTMLDivElement>({
    enabled: true,
    threshold: 0.15,
    rootMargin: "80px 0px",
  });

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      data-provider={dataProvider}
      data-aspect-ready={dataAspectReady}
      data-viewport-gated={inView ? "in" : "out"}
    >
      {inView ? children : null}
    </div>
  );
}
