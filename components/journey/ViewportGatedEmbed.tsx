"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { useOffscreenMedia } from "@/lib/journey/use-offscreen-media";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Giữ chỗ khi unload — tránh nhảy layout. */
  "data-provider"?: string;
  "data-aspect-ready"?: string;
};

/** Preload/unload embed cách khung khoảng bao nhiêu card (bài viết). */
const PRELOAD_ARTICLE_COUNT = 2;
/** Chiều cao card ước lượng khi chưa đo được (px). Sàn tối thiểu mỗi card. */
const FALLBACK_CARD_PX = 340;

/**
 * Chỉ mount iframe/player khi còn gần viewport; scroll ra đủ xa → unmount để dừng
 * audio/WebGL và giải phóng cache (YouTube, Sketchfab, Figma, Spline, Rive…).
 *
 * Vùng nhận diện được mở rộng ~{@link PRELOAD_ARTICLE_COUNT} chiều cao card lên trên
 * và xuống dưới viewport: embed được **nạp trước ~2 bài viết** trước khi lọt khung
 * (tránh loading giật khi vừa vào khung) và chỉ **unload sau khi cuộn qua ~2 bài**.
 * Chiều cao card đo từ `.j-milestone` chứa embed để bám sát số bài thực tế.
 */
export function ViewportGatedEmbed({
  children,
  className,
  style,
  "data-provider": dataProvider,
  "data-aspect-ready": dataAspectReady,
}: Props) {
  const [rootMargin, setRootMargin] = useState(
    () => `${PRELOAD_ARTICLE_COUNT * FALLBACK_CARD_PX}px 0px`,
  );
  const { ref, inView } = useOffscreenMedia<HTMLDivElement>({
    enabled: true,
    threshold: 0.15,
    rootMargin,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const card = el.closest<HTMLElement>(".j-milestone");
      const cardPx = card?.getBoundingClientRect().height ?? 0;
      const px = Math.round(
        Math.max(cardPx, FALLBACK_CARD_PX) * PRELOAD_ARTICLE_COUNT,
      );
      setRootMargin((prev) => {
        const next = `${px}px 0px`;
        return prev === next ? prev : next;
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref, inView]);

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
