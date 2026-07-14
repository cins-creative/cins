import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  compareTimelineOrder,
  type TimelineSortable,
} from "@/lib/journey/timeline-sort";

import {
  WORLD_JOURNEY_AUTHOR_ECHO_MS,
  WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA,
  WORLD_JOURNEY_FRESHNESS_WINDOW_MS,
} from "./worldJourneyFeedConstants";
import { WORLD_JOURNEY_SORT_OPTIONS } from "./worldJourneyFeedFilters";

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

/**
 * Điểm chất lượng — chỉ dùng sort «Đang sôi nổi».
 * Comment nặng hơn like; không cộng view toàn cục vào chất lượng vanity.
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
  const congDongId = m.congDongOrg?.orgId;
  if (congDongId && m.visibility === "cong-dong") {
    /* Soft-quota theo phòng — tránh một cộng đồng nuốt feed giữa. */
    return `cong_dong:${congDongId}`;
  }
  const userId = m.postOwnerId ?? m.lensOwnerId;
  if (userId) return `user:${userId}`;
  return `item:${m.id}`;
}

function feedPostedAtMs(m: MilestoneItem): number {
  const raw =
    m.feedSortAt ?? m.createdAt ?? resolveWorldJourneyFeedSortable(m).createdAt;
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Bài của viewer trong cửa sổ echo — luôn gần đầu feed của họ. */
export function isWorldJourneyAuthorEcho(
  m: MilestoneItem,
  viewerId: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!viewerId) return false;
  const ownerId = m.postOwnerId ?? m.lensOwnerId;
  if (!ownerId || ownerId !== viewerId) return false;
  const posted = feedPostedAtMs(m);
  if (posted <= 0) return false;
  return nowMs - posted <= WORLD_JOURNEY_AUTHOR_ECHO_MS;
}

export function isWorldJourneyFreshPost(
  m: MilestoneItem,
  nowMs = Date.now(),
): boolean {
  const posted = feedPostedAtMs(m);
  if (posted <= 0) return false;
  return nowMs - posted <= WORLD_JOURNEY_FRESHNESS_WINDOW_MS;
}

/**
 * Seen dùng để demote: bài của chính viewer không bị tự demote bởi impression của mình.
 */
export function effectiveViewerSeenCount(
  m: MilestoneItem,
  viewerId: string | null | undefined,
): number {
  const ownerId = m.postOwnerId ?? m.lensOwnerId;
  if (viewerId && ownerId && ownerId === viewerId) return 0;
  return m.viewerSeenCount ?? 0;
}

/**
 * @deprecated Unseen/freshness/reach — thay bằng `compareWorldJourneyFeedByScore`
 * trên World Timeline. Giữ export tạm nếu chỗ khác còn gọi.
 */
export function compareWorldJourneyFeedByUnseen(
  a: MilestoneItem,
  b: MilestoneItem,
  viewerId?: string | null,
  nowMs = Date.now(),
): number {
  return compareWorldJourneyFeedByScore(a, b, viewerId, nowMs);
}

/**
 * Rank Timeline theo điểm:
 * 1. Author echo (bài mình vừa đăng)
 * 2. `feedScore` / diem_hien_tai DESC
 * 3. Tie-break thời gian đăng
 *
 * Không dùng unseen / freshness / cold-start reach / org follow.
 */
export function compareWorldJourneyFeedByScore(
  a: MilestoneItem,
  b: MilestoneItem,
  viewerId?: string | null,
  nowMs = Date.now(),
): number {
  const echoA = isWorldJourneyAuthorEcho(a, viewerId, nowMs) ? 0 : 1;
  const echoB = isWorldJourneyAuthorEcho(b, viewerId, nowMs) ? 0 : 1;
  if (echoA !== echoB) return echoA - echoB;

  const scoreA = a.feedScore ?? 0;
  const scoreB = b.feedScore ?? 0;
  if (scoreA !== scoreB) return scoreB - scoreA;

  const postedA = feedPostedAtMs(a);
  const postedB = feedPostedAtMs(b);
  if (postedA !== postedB) return postedB - postedA;

  return compareWorldJourneyFeedOrder(a, b);
}

/**
 * Giữ tối đa `maxPerAuthor` bài / tác giả ở vùng ưu tiên; phần dư xếp sau
 * (giữ thứ tự tương đối trong mỗi nhóm).
 * Bài author-echo không bị demote — luôn thấy bài vừa đăng.
 */
export function applyAuthorSoftQuota(
  items: ReadonlyArray<MilestoneItem>,
  maxPerAuthor = WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA,
  viewerId?: string | null,
  nowMs = Date.now(),
): MilestoneItem[] {
  if (items.length === 0 || maxPerAuthor < 1) return items.slice();

  const primary: MilestoneItem[] = [];
  const overflow: MilestoneItem[] = [];
  const counts = new Map<string, number>();

  for (const m of items) {
    if (isWorldJourneyAuthorEcho(m, viewerId, nowMs)) {
      primary.push(m);
      continue;
    }
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

/**
 * Rank Timeline: sort theo điểm (+ echo) rồi soft quota max N bài/tác giả.
 * Thay `rankWorldJourneyFeedHybrid` trên World Feed server.
 */
export function rankWorldJourneyFeedByScore(
  items: ReadonlyArray<MilestoneItem>,
  viewerId?: string | null,
  maxPerAuthor = WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA,
  nowMs = Date.now(),
): MilestoneItem[] {
  return applyAuthorSoftQuota(
    items
      .slice()
      .sort((a, b) => compareWorldJourneyFeedByScore(a, b, viewerId, nowMs)),
    maxPerAuthor,
    viewerId,
    nowMs,
  );
}

/** @deprecated Dùng `rankWorldJourneyFeedByScore`. */
export function rankWorldJourneyFeedHybrid(
  items: ReadonlyArray<MilestoneItem>,
  viewerId?: string | null,
  maxPerAuthor = WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA,
  nowMs = Date.now(),
): MilestoneItem[] {
  return rankWorldJourneyFeedByScore(items, viewerId, maxPerAuthor, nowMs);
}

/** «Đang sôi nổi» — có cộng view toàn cục. */
function engagementScore(m: MilestoneItem): number {
  const likes = m.social?.likeCount ?? 0;
  const comments = m.comments ?? 0;
  const views = m.views ?? m.feedGlobalReach ?? 0;
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
  viewerId?: string | null,
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
      return (a, b) => compareWorldJourneyFeedByScore(a, b, viewerId);
  }
}

export function sortWorldJourneyMilestones(
  milestones: ReadonlyArray<MilestoneItem>,
  sort: WorldJourneySortOption,
  exploreIds: ReadonlySet<string>,
  viewerId?: string | null,
): MilestoneItem[] {
  const cmp = buildWorldJourneyFeedComparator(sort, exploreIds, viewerId);
  const sorted = milestones.slice().sort(cmp);
  /* Soft quota chỉ áp mặc định «Mới nhất» — các sort tường minh giữ đúng tiêu chí. */
  if (sort === "Mới nhất") {
    return applyAuthorSoftQuota(sorted, WORLD_JOURNEY_FEED_AUTHOR_SOFT_QUOTA, viewerId);
  }
  return sorted;
}
