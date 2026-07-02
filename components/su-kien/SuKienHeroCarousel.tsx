"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SuKienListItem } from "@/lib/to-chuc/su-kien-listing";

type Props = {
  events: SuKienListItem[];
  onOpen: (item: SuKienListItem) => void;
};

const ROTATE_MS = 5500;

const LOAI_GRADIENT: Record<string, string> = {
  open_day: "linear-gradient(135deg, #0e1759 0%, #1f74c9 55%, #6ec3fe 100%)",
  workshop: "linear-gradient(135deg, #1a0f3d 0%, #7c5cff 55%, #bb89f8 100%)",
  talkshow: "linear-gradient(135deg, #0f3d2e 0%, #117a65 55%, #48c9b0 100%)",
  trien_lam: "linear-gradient(135deg, #3d1a0f 0%, #d35400 55%, #f39c12 100%)",
  contest: "linear-gradient(135deg, #3d0f1a 0%, #c9184a 55%, #ff6b9d 100%)",
  career_fair: "linear-gradient(135deg, #0f1f3d 0%, #1656a0 55%, #1f74c9 100%)",
  hackathon: "linear-gradient(135deg, #1a1a2e 0%, #4a148c 55%, #7c5cff 100%)",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function pickHeroSlides(events: SuKienListItem[]): {
  slides: SuKienListItem[];
  mode: "live" | "upcoming" | "static";
} {
  const live = events.filter((e) => e.status === "active");
  if (live.length > 0) return { slides: live.slice(0, 8), mode: "live" };

  const upcoming = events
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => new Date(a.batDau).getTime() - new Date(b.batDau).getTime())
    .slice(0, 6);
  if (upcoming.length > 0) return { slides: upcoming, mode: "upcoming" };

  return { slides: [], mode: "static" };
}

export function SuKienHeroCarousel({ events, onOpen }: Props) {
  const reduceMotion = usePrefersReducedMotion();
  const { slides, mode } = useMemo(() => pickHeroSlides(events), [events]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides.length, mode]);

  const go = useCallback(
    (delta: number) => {
      if (slides.length <= 1) return;
      setIndex((i) => (i + delta + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (reduceMotion || slides.length <= 1) return;
    const id = window.setInterval(() => go(1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [go, reduceMotion, slides.length]);

  const active = slides[index] ?? null;

  if (mode === "static") {
    return (
      <section className="sk-hero sk-hero--static" aria-label="Sự kiện trên CINs">
        <div className="sk-hero-static-bg" aria-hidden />
      </section>
    );
  }

  return (
    <section
      className="sk-hero sk-hero--carousel"
      aria-label={mode === "live" ? "Sự kiện đang diễn ra" : "Sự kiện sắp diễn ra"}
      aria-roledescription="carousel"
    >
      <div className="sk-hero-slides" aria-hidden="true">
        {slides.map((item, idx) => {
          const gradient =
            LOAI_GRADIENT[item.loaiSuKien] ??
            "linear-gradient(135deg, #0e1117 0%, #1f2937 50%, #1f74c9 100%)";
          return (
            <div
              key={item.id}
              className={
                "sk-hero-slide" + (idx === index ? " sk-hero-slide--active" : "")
              }
            >
              {item.coverSrc ? (
                <Image
                  src={item.coverSrc}
                  alt=""
                  fill
                  priority={idx === 0}
                  className="sk-hero-slide-img object-cover"
                  sizes="100vw"
                />
              ) : (
                <div
                  className="sk-hero-slide-fallback"
                  style={{ background: gradient }}
                >
                  <ImageIcon size={56} strokeWidth={1.1} aria-hidden />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {active ? (
        <div className="sk-hero-cta-wrap">
          <button
            type="button"
            className="sk-hero-cta"
            onClick={() => onOpen(active)}
          >
            Xem chi tiết
          </button>
        </div>
      ) : null}
    </section>
  );
}
