"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ImageIcon, MapPin } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  labelLoaiSuKien,
  labelSuKienVe,
} from "@/lib/to-chuc/su-kien-constants";
import type { SuKienListItem } from "@/lib/to-chuc/su-kien-listing";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";

type Props = {
  events: SuKienListItem[];
  upcomingCount: number;
  pastCount: number;
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

const MONTHS = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

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

function eventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return {
    month: MONTHS[d.getMonth()] ?? "",
    day: String(d.getDate()).padStart(2, "0"),
  };
}

function formatTimeRange(batDau: string, ketThuc: string | null): string {
  const start = new Date(batDau);
  if (Number.isNaN(start.getTime())) return "";
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startStr = timeFmt.format(start);
  if (!ketThuc) return startStr;
  const end = new Date(ketThuc);
  if (Number.isNaN(end.getTime())) return startStr;
  return `${startStr} – ${timeFmt.format(end)}`;
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

export function SuKienHeroCarousel({
  events,
  upcomingCount,
  pastCount,
  onOpen,
}: Props) {
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
        <div className="sk-hero-inner">
          <p className="sk-hero-kicker">Lịch ngành sáng tạo</p>
          <h1 className="sk-hero-title">Sự kiện trên CINs</h1>
          <p className="sk-hero-lead">
            Open day, workshop, talkshow và festival — khám phá sự kiện từ trường,
            cơ sở đào tạo và studio trên nền tảng.
          </p>
          <div className="sk-hero-stats">
            <span>
              <strong>{upcomingCount}</strong> sắp diễn ra
            </span>
            {pastCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  <strong>{pastCount}</strong> đã qua
                </span>
              </>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const badgeLabel = mode === "live" ? "Đang diễn ra" : "Sắp diễn ra";
  const { month, day } = active ? eventDate(active.batDau) : { month: "", day: "" };
  const location = active
    ? formatSuKienDiaDiemDisplay(active.tinhThanh, active.diaDiem)
    : "";
  const time = active ? formatTimeRange(active.batDau, active.ketThuc) : "";

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

      <div className="sk-hero-scrim" aria-hidden />

      <div className="sk-hero-inner">
        <div className="sk-hero-topline">
          <p className="sk-hero-kicker">Lịch ngành sáng tạo</p>
          <div className="sk-hero-stats sk-hero-stats--overlay">
            <span>
              <strong>{upcomingCount}</strong> sắp diễn ra
            </span>
            {pastCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  <strong>{pastCount}</strong> đã qua
                </span>
              </>
            ) : null}
          </div>
        </div>

        {active ? (
          <div key={active.id} className="sk-hero-copy">
            <div className="sk-hero-badges">
              <span
                className={`sk-hero-live${mode === "live" ? " is-live" : " is-soon"}`}
              >
                {mode === "live" ? <span className="sk-hero-pulse" /> : null}
                {badgeLabel}
              </span>
              <span className="sk-hero-type">{labelLoaiSuKien(active.loaiSuKien)}</span>
            </div>

            <h1 className="sk-hero-title">{active.ten}</h1>

            {active.moTa ? (
              <p className="sk-hero-lead sk-hero-lead--clamp">{active.moTa}</p>
            ) : null}

            <div className="sk-hero-meta">
              <span className="sk-hero-date-chip">
                <CalendarDays size={15} strokeWidth={2} aria-hidden />
                <strong>{day}</strong> {month}
                {time ? ` · ${time}` : ""}
              </span>
              {location ? (
                <span className="sk-hero-meta-loc">
                  <MapPin size={15} strokeWidth={2} aria-hidden />
                  {location}
                </span>
              ) : null}
            </div>

            <div className="sk-hero-foot">
              <div className="sk-hero-host">
                <span>{active.orgTen}</span>
                <span>{labelSuKienVe(active.mienPhi, active.giaVe)}</span>
              </div>
              <button
                type="button"
                className="sk-hero-cta"
                onClick={() => onOpen(active)}
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <>
          <div className="sk-hero-progress" aria-hidden>
            {slides.map((item, idx) => (
              <span
                key={item.id}
                className={
                  "sk-hero-progress-seg" +
                  (idx === index ? " sk-hero-progress-seg--active" : "")
                }
              />
            ))}
          </div>

          <div className="sk-hero-controls">
            <button
              type="button"
              className="sk-hero-nav"
              aria-label="Sự kiện trước"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <div className="sk-hero-dots" role="tablist" aria-label="Chọn sự kiện">
              {slides.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === index}
                  aria-label={`${item.ten} — slide ${idx + 1}`}
                  className={
                    "sk-hero-dot" + (idx === index ? " sk-hero-dot--active" : "")
                  }
                  onClick={() => setIndex(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              className="sk-hero-nav"
              aria-label="Sự kiện sau"
              onClick={() => go(1)}
            >
              <ChevronRight size={22} strokeWidth={2.2} />
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
