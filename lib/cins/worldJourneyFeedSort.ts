import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  compareTimelineOrder,
  type TimelineSortable,
} from "@/lib/journey/timeline-sort";

import { WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA } from "./worldJourneyFeedConstants";
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

/** Org chưa follow xếp sau bài user + org đang follow. */
function worldJourneyOrgFollowRank(m: MilestoneItem): number {
  if (m.orgBaiDangRef || m.orgSuKienRef) {
    return m.feedOrgFollowed ? 0 : 1;
  }
  return 0;
}

/**
 * Điểm chất lượng cho sort mặc định (hybrid).
 * Comment nặng hơn like; **không** cộng view toàn cục (tránh bảng xếp hạng).
 * View toàn cục chỉ dùng ở «Đang sôi nổi».
 */
export function hybridQualityScore(m: MilestoneItem): number {
  const likes = m.social?.likeCount ?? 0;
  const comments = m.comments ?? 0;
  return comments * 3 + likes;
}

/** Khóa soft-quota: user hoặc org (không gộp lẫn). */
export function worldJourneyFeedAuthorKey(m: MilestoneItem): string {
  const orgId = m.orgBaiDangRef?.orgId ?? m.orgSuKienRef?.orgId;
  if (orgId) return `org:${orgId}`;
  const userId = m.postOwnerId ?? m.lensOwnerId;
  if (userId) return `user:${userId}`;
  return `item:${m.id}`;
}

/**
 * Mặc định hybrid: chưa xem → org đã follow → chất lượng (comment/like) → timeline.
 * Không dùng view toàn cục ở tầng này.
 */
export function compareWorldJourneyFeedByUnseen(
  a: MilestoneItem,
  b: MilestoneItem,
): number {
  const sa = a.viewerSeenCount ?? 0;
  const sb = b.viewerSeenCount ?? 0;
  if (sa !== sb) return sa - sb;
  const fa = worldJourneyOrgFollowRank(a);
  const fb = worldJourneyOrgFollowRank(b);
  if (fa !== fb) return fa - fb;
  const qa = hybridQualityScore(a);
  const qb = hybridQualityScore(b);
  if (qa !== qb) return qb - qa;
  return compareWorldJourneyFeedOrder(a, b);
}

/**
 * Giữ tối đa `maxPerAuthor` bài / tác giả ở vùng ưu tiên; phần dư xếp sau
 * (giữ thứ tự tương đối trong mỗi nhóm).
 */
export function applyAuthorSoftQuota(
  items: ReadonlyArray<MilestoneItem>,
  maxPerAuthor = WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA,
): MilestoneItem[] {
  if (items.length === 0 || maxPerAuthor < 1) return items.slice();

  const primary: MilestoneItem[] = [];
  const overflow: MilestoneItem[] = [];
  const counts = new Map<string, number>();

  for (const m of items) {
    const key = worldJourneyFeedAuthorKey(m);
    const n = counts.get(key) ?? 0;
    if (n < maxPerAuthor) {
      primary.push(m);
      counts.set(key, n + 1);
    } else {
      overflow.push(m);
    }
  }

  return primary.concat(overflow);
}

/** Rank mặc định server: hybrid comparator + soft quota tác giả. */
export function rankWorldJourneyFeedHybrid(
  items: ReadonlyArray<MilestoneItem>,
  maxPerAuthor = WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA,
): MilestoneItem[] {
  return applyAuthorSoftQuota(
    items.slice().sort(compareWorldJourneyFeedByUnseen),
    maxPerAuthor,
  );
}

/** «Đang sôi nổi» — có cộng view toàn cục. */
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
  const sorted = milestones.slice().sort(cmp);
  /* Soft quota chỉ áp mặc định «Mới nhất» — các sort tường minh giữ đúng tiêu chí. */
  if (sort === "Mới nhất") {
    return applyAuthorSoftQuota(sorted);
  }
  return sorted;
}
