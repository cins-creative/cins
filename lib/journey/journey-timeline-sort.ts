import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  compareTimelineOrder,
  type TimelineSortable,
} from "@/lib/journey/timeline-sort";

export type JourneyTimelineSortable = TimelineSortable & {
  journeyGhimLuc?: string | null;
};

function journeyGhimTimestamp(item: JourneyTimelineSortable): number {
  const raw = item.journeyGhimLuc;
  return raw ? Date.parse(raw) : 0;
}

/**
 * Sort Journey view timeline: ghim lên đầu (mới ghim trước) → thứ tự timeline thường.
 * Chỉ dùng view Journey — không áp World feed / Gallery / entity lens.
 */
export function compareJourneyViewTimelineOrder(
  a: JourneyTimelineSortable,
  b: JourneyTimelineSortable,
): number {
  const aPin = a.journeyGhimLuc ? 1 : 0;
  const bPin = b.journeyGhimLuc ? 1 : 0;
  if (aPin !== bPin) return bPin - aPin;

  if (aPin && bPin) {
    const aGhim = journeyGhimTimestamp(a);
    const bGhim = journeyGhimTimestamp(b);
    if (aGhim !== bGhim) return bGhim - aGhim;
  }

  return compareTimelineOrder(a, b);
}

export function sortJourneyViewTimeline<T extends JourneyTimelineSortable>(
  items: ReadonlyArray<T>,
): T[] {
  return [...items].sort(compareJourneyViewTimelineOrder);
}

export function splitJourneyPinnedMilestones(
  milestones: ReadonlyArray<MilestoneItem>,
): {
  pinned: MilestoneItem[];
  rest: MilestoneItem[];
} {
  const pinned: MilestoneItem[] = [];
  const rest: MilestoneItem[] = [];
  for (const m of milestones) {
    if (m.journeyGhimLuc) pinned.push(m);
    else rest.push(m);
  }
  return {
    pinned: sortJourneyViewTimeline(pinned),
    rest,
  };
}
