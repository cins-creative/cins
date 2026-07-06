import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  compareTimelineOrder,
  type TimelineSortable,
} from "@/lib/journey/timeline-sort";

import {
  WORLD_JOURNEY_SORT_OPTIONS,
} from "./worldJourneyFeedFilters";

export type WorldJourneySortOption =
  (typeof WORLD_JOURNEY_SORT_OPTIONS)[number];

/** Sort key feed — sự kiện tương lai không dùng ngày `bat_dau` (tránh ghim đầu năm). */
export function resolveWorldJourneyFeedSortable(
  milestone: MilestoneItem,
): TimelineSortable {
  const batDau = milestone.orgSuKienRef?.batDau;
  if (batDau) {
    const eventMs = Date.parse(batDau);
    const sortIso =
      !Number.isNaN(eventMs) && eventMs <= Date.now()
        ? batDau
        : milestone.feedSortAt ?? new Date().toISOString();
    const d = new Date(sortIso);
    if (!Number.isNaN(d.getTime())) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        createdAt: sortIso,
        visibility: milestone.visibility,
        id: milestone.id,
      };
    }
  }

  return {
    year: milestone.year,
    month: milestone.month,
    day: milestone.day,
    createdAt: milestone.createdAt,
    visibility: milestone.visibility,
    id: milestone.id,
  };
}

export function compareWorldJourneyFeedOrder(
  a: MilestoneItem,
  b: MilestoneItem,
): number {
  return compareTimelineOrder(
    resolveWorldJourneyFeedSortable(a),
    resolveWorldJourneyFeedSortable(b),
  );
}

/** Chưa xem / xem ít lên trên; cùng mức tiếp cận thì theo thứ tự timeline feed. */
export function compareWorldJourneyFeedByUnseen(
  a: MilestoneItem,
  b: MilestoneItem,
): number {
  const sa = a.viewerSeenCount ?? 0;
  const sb = b.viewerSeenCount ?? 0;
  if (sa !== sb) return sa - sb;
  return compareWorldJourneyFeedOrder(a, b);
}

function engagementScore(m: MilestoneItem): number {
  const likes = m.social?.likeCount ?? 0;
  const comments = m.comments ?? 0;
  const views = m.views ?? 0;
  return likes * 2 + comments * 3 + views;
}

function isVerifiedMilestone(m: MilestoneItem): boolean {
  return m.variant === "verified" || Boolean(m.verifiedBy?.trim());
}

/**
 * Comparator sắp xếp milestone feed World Journey theo lựa chọn toolbar.
 * `exploreIds` — id bài Khám phá (chưa theo dõi) để sort "Theo dõi".
 */
export function buildWorldJourneyFeedComparator(
  sort: WorldJourneySortOption,
  exploreIds: ReadonlySet<string>,
): (a: MilestoneItem, b: MilestoneItem) => number {
  switch (sort) {
    case "Đang sôi nổi":
      return (a, b) => {
        const diff = engagementScore(b) - engagementScore(a);
        return diff !== 0 ? diff : compareWorldJourneyFeedOrder(a, b);
      };
    case "Theo dõi":
      return (a, b) => {
        const aExplore = exploreIds.has(a.id) ? 1 : 0;
        const bExplore = exploreIds.has(b.id) ? 1 : 0;
        if (aExplore !== bExplore) return aExplore - bExplore;
        return compareWorldJourneyFeedOrder(a, b);
      };
    case "Verified":
      return (a, b) => {
        const av = isVerifiedMilestone(a) ? 1 : 0;
        const bv = isVerifiedMilestone(b) ? 1 : 0;
        if (av !== bv) return bv - av;
        return compareWorldJourneyFeedOrder(a, b);
      };
    case "Mới nhất":
    default:
      return compareWorldJourneyFeedByUnseen;
  }
}

export function sortWorldJourneyMilestones(
  milestones: ReadonlyArray<MilestoneItem>,
  sort: WorldJourneySortOption,
  exploreIds: ReadonlySet<string>,
): MilestoneItem[] {
  const cmp = buildWorldJourneyFeedComparator(sort, exploreIds);
  return milestones.slice().sort(cmp);
}
