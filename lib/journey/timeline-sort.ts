import type { MilestoneVisibility } from "@/components/journey/milestone-types";

/** Fields used to order milestones on a user's Journey timeline. */
export type TimelineSortable = {
  year: number;
  month: number;
  day: number;
  /** Hydrated items — user-journey sort time (self: tao_luc; tagged: xu_ly_luc; bookmark: save time). */
  createdAt?: string | null;
  /** Stub rows — same semantics as `createdAt`. */
  taoLuc?: string | null;
  visibility?: MilestoneVisibility;
  id?: string;
};

export function resolveTaggedTimelineSortAt(
  xuLyLuc: string | null | undefined,
  fallbackTaoLuc: string | null | undefined,
): string | null {
  return xuLyLuc ?? fallbackTaoLuc ?? null;
}

function timelineSortTimestamp(item: TimelineSortable): number {
  const raw = item.createdAt ?? item.taoLuc;
  return raw ? Date.parse(raw) : 0;
}

function calendarSortTimestamp(
  item: Pick<TimelineSortable, "year" | "month" | "day">,
): number {
  return new Date(
    `${item.year}-${String(item.month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`,
  ).getTime();
}

/**
 * Journey timeline order: calendar date DESC → user-relative time DESC → feature tiebreak → id.
 * `feature` no longer pins above newer items on the same day.
 */
export function compareTimelineOrder(a: TimelineSortable, b: TimelineSortable): number {
  const aDate = calendarSortTimestamp(a);
  const bDate = calendarSortTimestamp(b);
  if (aDate !== bDate) return bDate - aDate;

  const aSort = timelineSortTimestamp(a);
  const bSort = timelineSortTimestamp(b);
  if (aSort !== bSort) return bSort - aSort;

  const aFeat = a.visibility === "feature" ? 1 : 0;
  const bFeat = b.visibility === "feature" ? 1 : 0;
  if (aFeat !== bFeat) return bFeat - aFeat;

  return (a.id ?? "").localeCompare(b.id ?? "");
}
