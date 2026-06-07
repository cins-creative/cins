export type TimelineScrollSpy = { year: string; month: string };

/** Mép dưới context bar Journey (nav + `.j-tlb`). */
export const JOURNEY_TIMELINE_SPY_ANCHOR_PX = 120;

export function timelineScrollSpyFromParts(
  year: string | number | null | undefined,
  month: string | number | null | undefined,
  fallbackYear: string,
): TimelineScrollSpy {
  const y = year != null && String(year).trim() ? String(year) : fallbackYear;
  const monthNum = typeof month === "number" ? month : Number(month);
  return {
    year: y,
    month:
      Number.isFinite(monthNum) && monthNum > 0 ? `Tháng ${monthNum}` : "",
  };
}

/** Scroll-spy: phần tử cuối có `top` ≤ anchor (giống Journey timeline). */
export function computeScrollSpyFromMarkers(
  root: HTMLElement,
  selector: string,
  anchorPx: number,
): TimelineScrollSpy | null {
  const markers = root.querySelectorAll<HTMLElement>(selector);
  if (!markers.length) return null;

  let active: HTMLElement | null = null;
  for (const el of markers) {
    if (el.getBoundingClientRect().top <= anchorPx + 8) {
      active = el;
    }
  }
  const target = active ?? markers[0];
  const year = target.getAttribute("data-year");
  const monthRaw = target.getAttribute("data-month");
  if (!year) return null;
  const monthNum = monthRaw ? Number(monthRaw) : NaN;
  return {
    year,
    month:
      Number.isFinite(monthNum) && monthNum > 0 ? `Tháng ${monthNum}` : "",
  };
}

export function scrollSpyAnchorBelowBar(
  bar: HTMLElement | null,
  fallbackPx: number,
): number {
  if (!bar) return fallbackPx;
  return bar.getBoundingClientRect().bottom + 4;
}
