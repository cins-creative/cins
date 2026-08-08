"use client";

import { TicketPercent } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

/** px/s — mobile nhanh hơn vì viewport hẹp. */
const TICKER_SPEED_PX_S = 59;
const TICKER_SPEED_PX_S_MOBILE = 71;
const TICKER_MIN_DURATION_S = 6;
const TICKER_MAX_DURATION_S = 44;

type Props = {
  lines: string[];
};

function buildRunLines(lines: string[]): string[] {
  if (lines.length === 0) return [];
  /** Mỗi “vòng” đủ dài — tránh khoảng trống giữa viewport khi cuộn. */
  const repeats = lines.length === 1 ? 6 : 3;
  const out: string[] = [];
  for (let r = 0; r < repeats; r += 1) out.push(...lines);
  return out;
}

function VoucherRun({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={`${line}-${i}`} className="ch-list-card-voucher-strip-item">
          {line}
          <span className="ch-list-card-voucher-strip-sep" aria-hidden>
            ◆
          </span>
        </span>
      ))}
    </>
  );
}

function resolveTickerSpeed(): number {
  if (typeof window === "undefined") return TICKER_SPEED_PX_S;
  return window.matchMedia("(max-width: 560px)").matches
    ? TICKER_SPEED_PX_S_MOBILE
    : TICKER_SPEED_PX_S;
}

function resolveTickerDuration(runWidth: number): number {
  const raw = runWidth / resolveTickerSpeed();
  return Math.min(TICKER_MAX_DURATION_S, Math.max(TICKER_MIN_DURATION_S, raw));
}

/** Strip voucher cuối card shop — ticker vòng lặp mượt (2 run giống nhau). */
export function ChListVoucherTicker({ lines }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const measuredShiftRef = useRef(0);
  const [ready, setReady] = useState(false);
  const runLines = buildRunLines(lines);

  useLayoutEffect(() => {
    if (lines.length === 0) return;

    const track = trackRef.current;
    if (!track) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMq = window.matchMedia("(max-width: 560px)");

    const applyMetrics = () => {
      if (reducedMotion.matches) {
        track.style.removeProperty("--ch-voucher-ticker-shift");
        track.style.removeProperty("--ch-voucher-ticker-duration");
        measuredShiftRef.current = 0;
        setReady(false);
        return;
      }

      const run = track.querySelector<HTMLElement>(
        ".ch-list-card-voucher-strip-run",
      );
      const runWidth = Math.round(run?.getBoundingClientRect().width ?? 0);
      if (runWidth <= 0) return;

      if (Math.abs(runWidth - measuredShiftRef.current) < 1) return;
      measuredShiftRef.current = runWidth;

      track.style.setProperty("--ch-voucher-ticker-shift", `${runWidth}px`);
      track.style.setProperty(
        "--ch-voucher-ticker-duration",
        `${resolveTickerDuration(runWidth)}s`,
      );
      setReady(true);
    };

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleMeasure = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        applyMetrics();
      }, 120);
    };

    applyMetrics();
    void document.fonts?.ready.then(applyMetrics);

    window.addEventListener("resize", scheduleMeasure, { passive: true });
    mobileMq.addEventListener("change", scheduleMeasure);
    reducedMotion.addEventListener("change", scheduleMeasure);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleMeasure);
      mobileMq.removeEventListener("change", scheduleMeasure);
      reducedMotion.removeEventListener("change", scheduleMeasure);
    };
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <div className="ch-list-card-voucher-strip" aria-label="Voucher đang chạy">
      <span className="ch-list-card-voucher-strip-perf" aria-hidden />
      <div className="ch-list-card-voucher-strip-brand" aria-hidden>
        <TicketPercent size={15} strokeWidth={2.25} />
        <span>Voucher</span>
      </div>
      <div className="ch-list-card-voucher-strip-marquee">
        <div
          ref={trackRef}
          className={`ch-list-card-voucher-strip-track${ready ? " is-ready" : ""}`}
        >
          <span className="ch-list-card-voucher-strip-run">
            <VoucherRun lines={runLines} />
          </span>
          <span className="ch-list-card-voucher-strip-run" aria-hidden>
            <VoucherRun lines={runLines} />
          </span>
        </div>
      </div>
      <p className="ch-list-sr-only">{lines.join(" - ")}</p>
    </div>
  );
}
