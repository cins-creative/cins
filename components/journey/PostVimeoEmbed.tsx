"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ViewportGatedEmbed } from "@/components/journey/ViewportGatedEmbed";
import {
  canvasAspectFromRatio,
  videoNaturalAspect,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";

type Props = {
  /** URL Vimeo (đã classify) — dùng đọc kích thước qua oEmbed. */
  url: string;
  /** Ratio đã lưu trên block (nếu có) — bỏ qua fetch. */
  storedRatio?: VideoCanvasRatio | null;
  /** Iframe player dựng sẵn ở `PostRenderer`. */
  children: ReactNode;
};

/**
 * Vimeo embed read-only — mặc định CSS ép khung 16/9 nên video dọc bị letterbox.
 * Đọc kích thước thật qua oEmbed (`/api/embed/dimensions`) rồi set `aspect-ratio`
 * inline theo đúng tỉ lệ gốc. Iframe cross-origin không đọc pixel trực tiếp được.
 */
export function PostVimeoEmbed({ url, storedRatio = null, children }: Props) {
  const [aspect, setAspect] = useState<number | null>(
    storedRatio ? canvasAspectFromRatio(storedRatio) : null,
  );

  useEffect(() => {
    if (storedRatio) return;
    let cancelled = false;
    fetch(`/api/embed/dimensions?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const w = Number(d.width);
        const h = Number(d.height);
        if (w > 0 && h > 0) setAspect(videoNaturalAspect(w, h));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url, storedRatio]);

  return (
    <ViewportGatedEmbed
      className="b-embed b-embed-ro is-iframe"
      data-provider="vimeo"
      data-aspect-ready={aspect != null ? "1" : undefined}
      style={aspect != null ? { aspectRatio: String(aspect) } : undefined}
    >
      {children}
    </ViewportGatedEmbed>
  );
}
