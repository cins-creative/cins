import type { MilestoneItem } from "@/components/journey/milestone-types";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";

import {
  WORLD_JOURNEY_SORT_OPTIONS,
} from "./worldJourneyFeedFilters";

export type WorldJourneySortOption =
  (typeof WORLD_JOURNEY_SORT_OPTIONS)[number];

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
        return diff !== 0 ? diff : compareTimelineOrder(a, b);
      };
    case "Theo dõi":
      return (a, b) => {
        const aExplore = exploreIds.has(a.id) ? 1 : 0;
        const bExplore = exploreIds.has(b.id) ? 1 : 0;
        if (aExplore !== bExplore) return aExplore - bExplore;
        return compareTimelineOrder(a, b);
      };
    case "Verified":
      return (a, b) => {
        const av = isVerifiedMilestone(a) ? 1 : 0;
        const bv = isVerifiedMilestone(b) ? 1 : 0;
        if (av !== bv) return bv - av;
        return compareTimelineOrder(a, b);
      };
    case "Mới nhất":
    default:
      return compareTimelineOrder;
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
