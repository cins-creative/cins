import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { isVisibleOnWorldJourneyFeed } from "@/lib/cins/worldJourneyFeedVisibility";
import { hideProcessingVideoFromViewer } from "@/lib/journey/video-processing-meta";
import {
  attachSocialState,
  buildSelfMilestonesForCotMocs,
} from "@/lib/journey/milestones-fetch";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  attachFeedScoresAndFilter,
  feedScoreTargetFromMilestone,
  loadActiveFeedScoreMap,
} from "@/lib/cins/feed-scoring-load";
import {
  promoteWorldJourneyFreshCandidates,
  rankWorldJourneyFeedByScore,
} from "@/lib/cins/worldJourneyFeedSort";
import { listFriends } from "@/lib/social/ket-ban";
import { loadUserSuKienPhanHoiMap } from "@/lib/to-chuc/su-kien-dang-ky";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  fetchWorldJourneyOrgBaiDangMilestones,
  listFollowingOrgIds,
} from "@/lib/cins/worldJourneyOrgFeed";
import {
  fetchFollowedOrgSuKienMilestones,
  fetchFriendSuggestedSuKienMilestones,
} from "@/lib/cins/worldJourneyOrgSuKienFeed";
import {
  fetchWorldJourneyMemberCongDongMilestones,
  fetchWorldJourneySuggestedCongDongMilestones,
  listActiveCongDongOrgIds,
} from "@/lib/cins/worldJourneyCongDongFeed";
import {
  WORLD_JOURNEY_FEED_PAGE_SIZE,
  WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC,
  WORLD_JOURNEY_FIRST_IMPRESSION_CAP,
} from "@/lib/cins/worldJourneyFeedConstants";
import {
  resolveWorldJourneyFeedFilterChip,
  worldJourneyMilestoneMatchesFilter,
  worldJourneyMilestoneMatchesLinhVuc,
} from "@/lib/cins/worldJourneyFeedFilters";
import {
  matchesFeedSource,
  normalizeFeedSource,
  type FeedSourceFilter,
} from "@/lib/cins/worldJourneyFeedSource";
import { withWorldBoostMilestones } from "@/lib/cins/world-boost";

const FEED_POOL_LIMIT = 80;
/** Pool rộng khi đang lọc — đủ bài để filter media/nhúng/lĩnh vực có kết quả. */
const FEED_FILTER_POOL_LIMIT = 240;
const QUERY_LIMIT = 120;

const COT_MOC_FEED_SELECT =
  "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_nguoi_dung, id_to_chuc";

type CotMocFeedRow = {
  id: string;
  loai_moc: string;
  nguon_goc: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  che_do_hien_thi: string;
  tao_luc: string | null;
  id_nguoi_dung: string;
  id_to_chuc?: string | null;
};

type LinkRow = {
  id_cot_moc: string;
  content_cot_moc: CotMocFeedRow | null;
};

type AuthorRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

async function listFollowingUserIds(viewerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", "nguoi_dung")
    .returns<Array<{ id_doi_tuong: string }>>();

  return (data ?? []).map((row) => row.id_doi_tuong);
}

/** Tag (thẻ) đang theo dõi — `loai_doi_tuong='the'` (L17). */
async function listFollowingTagIds(viewerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", "the")
    .returns<Array<{ id_doi_tuong: string }>>();

  return (data ?? []).map((row) => row.id_doi_tuong);
}

/**
 * Cột mốc gắn các thẻ đang theo dõi (qua `article_gan_cot_moc`).
 * Visibility helper sẽ tự lọc: `feature` từ mọi người, `public` chỉ bạn bè/đang theo dõi.
 */
async function fetchLinkRowsForFollowedTags(
  tagIds: string[],
): Promise<LinkRow[]> {
  if (tagIds.length === 0) return [];
  const admin = createServiceRoleClient();

  const { data: gan } = await admin
    .from("article_gan_cot_moc")
    .select("id_cot_moc")
    .in("id_bai_viet", tagIds)
    .limit(QUERY_LIMIT)
    .returns<Array<{ id_cot_moc: string }>>();

  const cotMocIds = [...new Set((gan ?? []).map((r) => r.id_cot_moc))];
  if (cotMocIds.length === 0) return [];

  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(`id_cot_moc, content_cot_moc:content_cot_moc!inner(${COT_MOC_FEED_SELECT})`)
    .in("content_cot_moc.id", cotMocIds)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .limit(QUERY_LIMIT)
    .returns<LinkRow[]>();

  return data ?? [];
}

async function fetchLinkRowsForAuthors(
  authorIds: string[],
  cheDoModes: string[],
): Promise<LinkRow[]> {
  if (authorIds.length === 0) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(`id_cot_moc, content_cot_moc:content_cot_moc!inner(${COT_MOC_FEED_SELECT})`)
    .in("content_cot_moc.id_nguoi_dung", authorIds)
    .in("content_cot_moc.che_do_hien_thi", cheDoModes)
    .order("thoi_diem", {
      referencedTable: "content_cot_moc",
      ascending: false,
    })
    .limit(QUERY_LIMIT)
    .returns<LinkRow[]>();

  return data ?? [];
}

async function fetchGlobalFeatureLinkRows(): Promise<LinkRow[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(`id_cot_moc, content_cot_moc:content_cot_moc!inner(${COT_MOC_FEED_SELECT})`)
    .eq("content_cot_moc.che_do_hien_thi", "feature")
    .limit(QUERY_LIMIT)
    .returns<LinkRow[]>();

  return data ?? [];
}

function dedupeCotMocs(rows: LinkRow[]): CotMocFeedRow[] {
  const byId = new Map<string, CotMocFeedRow>();
  for (const row of rows) {
    const cm = row.content_cot_moc;
    /* Bài cộng đồng lấy riêng qua worldJourneyCongDongFeed — tránh lẫn pool user. */
    if (!cm || cm.che_do_hien_thi === "cong_dong") continue;
    if (!byId.has(cm.id)) byId.set(cm.id, cm);
  }
  return Array.from(byId.values());
}

function isVisibleCotMoc(
  cm: CotMocFeedRow,
  viewerId: string,
  friendSet: Set<string>,
  followingSet: Set<string>,
): boolean {
  return isVisibleOnWorldJourneyFeed(cm.che_do_hien_thi, {
    viewerId,
    ownerId: cm.id_nguoi_dung,
    viewerIsFriend: friendSet.has(cm.id_nguoi_dung),
    viewerIsFollowing: followingSet.has(cm.id_nguoi_dung),
  });
}

function filterFeedMilestonesForViewer(
  milestones: MilestoneItem[],
  viewerId: string,
): MilestoneItem[] {
  return milestones.filter(
    (m) =>
      !hideProcessingVideoFromViewer(
        m.noiDungBlocks,
        viewerId,
        m.postOwnerId ?? m.lensOwnerId ?? null,
      ),
  );
}

async function loadAuthors(authorIds: string[]): Promise<Map<string, AuthorRow>> {
  const map = new Map<string, AuthorRow>();
  if (authorIds.length === 0) return map;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", authorIds)
    .returns<AuthorRow[]>();

  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

function applyLensOwners(
  milestones: MilestoneItem[],
  ownerIdByCotMoc: Map<string, string>,
  authors: Map<string, AuthorRow>,
): MilestoneItem[] {
  return milestones.map((m) => {
    const cotMocId = m.cotMocId ?? m.id;
    const ownerId = ownerIdByCotMoc.get(cotMocId) ?? null;
    const author = ownerId ? authors.get(ownerId) : null;
    const slug = author?.slug ?? m.postOwnerSlug ?? null;
    return {
      ...m,
      lensOwnerId: ownerId,
      lensOwnerSlug: slug,
      lensOwnerName: author?.ten_hien_thi?.trim() || slug,
      lensOwnerAvatarUrl: getAvatarUrl(author?.avatar_id ?? null),
      postOwnerSlug: slug ?? m.postOwnerSlug,
      postOwnerId: ownerId ?? m.postOwnerId,
    };
  });
}

/**
 * Xếp hạng World Timeline theo điểm:
 * 1. Load `content_diem_feed` (bat_dau_luc trong 7 ngày) + gắn điểm / lọc
 * 2. Sort diem_hien_tai DESC
 * 3. Soft quota max N bài/tác giả
 * 4. Promote tối đa N bài fresh vào đầu pool (để client first-impression có payload)
 * Cắt còn `poolLimit`. Boost merge ở `fetchWorldJourneyFeedPage*`.
 */
async function rankFeedByScore(
  viewerId: string,
  items: MilestoneItem[],
  options?: { poolLimit?: number; softQuota?: boolean },
): Promise<MilestoneItem[]> {
  if (items.length === 0) return [];

  const poolLimit = options?.poolLimit ?? FEED_POOL_LIMIT;
  const softQuota = options?.softQuota !== false;

  const targets = items
    .map(feedScoreTargetFromMilestone)
    .filter((t): t is NonNullable<typeof t> => t != null);

  const { map: scoreMap, config: scoreCfg } =
    await loadActiveFeedScoreMap(targets);
  const scored = attachFeedScoresAndFilter(items, scoreMap, Date.now(), scoreCfg);

  const ranked = softQuota
    ? rankWorldJourneyFeedByScore(scored, viewerId)
    : rankWorldJourneyFeedByScore(scored, viewerId, Number.POSITIVE_INFINITY);

  const withFresh = promoteWorldJourneyFreshCandidates(
    ranked,
    WORLD_JOURNEY_FIRST_IMPRESSION_CAP,
  );
  return withFresh.slice(0, poolLimit);
}

export type WorldJourneyFeedPage = {
  milestones: MilestoneItem[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number;
};

export type WorldJourneyFeedPageOptions = {
  filter?: string | null;
  source?: FeedSourceFilter | string | null;
  linhVuc?: string | null;
};

function feedPageNeedsWidePool(opts: WorldJourneyFeedPageOptions): boolean {
  const filter = opts.filter?.trim();
  if (filter && filter !== "all") return true;
  if (opts.linhVuc?.trim()) return true;
  const source = normalizeFeedSource(opts.source);
  return source !== "all";
}

function applyWorldJourneyFeedPageFilters(
  items: ReadonlyArray<MilestoneItem>,
  opts: WorldJourneyFeedPageOptions,
): MilestoneItem[] {
  const chip = resolveWorldJourneyFeedFilterChip(opts.filter);
  const source = normalizeFeedSource(opts.source);
  const linhVuc = opts.linhVuc?.trim() || null;
  return items.filter(
    (milestone) =>
      matchesFeedSource(milestone, source) &&
      worldJourneyMilestoneMatchesFilter(milestone, chip) &&
      worldJourneyMilestoneMatchesLinhVuc(milestone, linhVuc),
  );
}

async function buildWorldJourneyFeedRanked(
  viewerId: string,
  rankOptions?: { poolLimit?: number; softQuota?: boolean },
): Promise<MilestoneItem[]> {
  const [
    friendIds,
    followingIds,
    followingTagIds,
    followingOrgIds,
    phanHoiMap,
    memberCongDongOrgIds,
  ] = await Promise.all([
    listFriends(viewerId),
    listFollowingUserIds(viewerId),
    listFollowingTagIds(viewerId),
    listFollowingOrgIds(viewerId),
    loadUserSuKienPhanHoiMap(viewerId),
    listActiveCongDongOrgIds(viewerId),
  ]);

  /* Sự kiện viewer đã phản hồi (Quan tâm / Đã đăng ký) → ẩn khỏi feed: đã hành
     động rồi thì không lặp lại. `loadUserSuKienPhanHoiMap` đã bỏ trạng thái huỷ. */
  const respondedSuKienIds = new Set(phanHoiMap.keys());
  const dropRespondedSuKien = (m: MilestoneItem): boolean => {
    const sid = m.orgSuKienRef?.suKienId;
    return !sid || !respondedSuKienIds.has(sid);
  };

  const friendSet = new Set(friendIds);
  const followingSet = new Set(followingIds);
  const followingOnlyIds = followingIds.filter((id) => !friendSet.has(id));
  const knownAuthorIds = new Set<string>([viewerId, ...friendIds, ...followingIds]);

  const [
    ownLinks,
    friendLinks,
    followingLinks,
    featureLinks,
    tagLinks,
    orgMilestones,
    orgSuKienMilestonesAll,
    friendSuKienSuggestionsAll,
    memberCongDongMilestones,
  ] = await Promise.all([
    fetchLinkRowsForAuthors(
      [viewerId],
      ["feature", "public", "theo_nhom", "chi_minh"],
    ),
    fetchLinkRowsForAuthors(friendIds, ["feature", "public", "theo_nhom"]),
    fetchLinkRowsForAuthors(followingOnlyIds, ["feature", "public"]),
    fetchGlobalFeatureLinkRows(),
    fetchLinkRowsForFollowedTags(followingTagIds),
    fetchWorldJourneyOrgBaiDangMilestones(followingOrgIds),
    fetchFollowedOrgSuKienMilestones(followingOrgIds, friendIds),
    fetchFriendSuggestedSuKienMilestones(friendIds),
    fetchWorldJourneyMemberCongDongMilestones(
      viewerId,
      followingOrgIds,
      memberCongDongOrgIds,
    ),
  ]);

  const congDongConnectedOrgIds = [
    ...new Set([...memberCongDongOrgIds, ...followingOrgIds]),
  ];
  const suggestedCongDongMilestones =
    await fetchWorldJourneySuggestedCongDongMilestones(
      viewerId,
      congDongConnectedOrgIds,
    );

  /* Ẩn sự kiện viewer đã phản hồi (Quan tâm / Đã đăng ký) khỏi mọi nguồn feed. */
  const orgSuKienMilestones = orgSuKienMilestonesAll.filter(dropRespondedSuKien);
  const friendSuKienSuggestions =
    friendSuKienSuggestionsAll.filter(dropRespondedSuKien);

  const strangerFeatureLinks = featureLinks.filter((row) => {
    const ownerId = row.content_cot_moc?.id_nguoi_dung;
    return ownerId ? !knownAuthorIds.has(ownerId) : false;
  });

  const cotMocs = dedupeCotMocs([
    ...ownLinks,
    ...friendLinks,
    ...followingLinks,
    ...strangerFeatureLinks,
    ...tagLinks,
  ]).filter((cm) => isVisibleCotMoc(cm, viewerId, friendSet, followingSet));

  let followingPool: MilestoneItem[] = [];

  if (cotMocs.length > 0) {
    const ownerIdByCotMoc = new Map(
      cotMocs.map((cm) => [cm.id, cm.id_nguoi_dung]),
    );
    const authorIds = [...new Set(cotMocs.map((cm) => cm.id_nguoi_dung))];

    const admin = createServiceRoleClient();
    const [built, authors] = await Promise.all([
      buildSelfMilestonesForCotMocs(
        admin,
        cotMocs as Parameters<typeof buildSelfMilestonesForCotMocs>[1],
      ),
      loadAuthors(authorIds),
    ]);

    const withLens = applyLensOwners(built, ownerIdByCotMoc, authors);
    followingPool = await attachSocialState(admin, withLens, viewerId);
  }

  const followedSuKienIds = new Set(
    orgSuKienMilestones.map((m) => m.orgSuKienRef?.suKienId).filter(Boolean),
  );
  const dedupedFriendSuKien = friendSuKienSuggestions.filter(
    (m) => !followedSuKienIds.has(m.orgSuKienRef?.suKienId ?? ""),
  );

  const congDongIds = new Set(
    [...memberCongDongMilestones, ...suggestedCongDongMilestones].map(
      (m) => m.cotMocId ?? m.id,
    ),
  );

  /* Gắn nhãn nguồn (`feedSource` / `feedFollowing`) để client lọc theo
     FeedSourceFilter (Khám phá tất cả / Theo dõi / Chỉ người dùng / Chỉ tổ chức). */
  const userPool = followingPool
    .filter((m) => !congDongIds.has(m.cotMocId ?? m.id))
    .map((m) => {
      const ownerId = m.postOwnerId ?? m.lensOwnerId ?? null;
      return {
        ...m,
        feedSource: "user" as const,
        feedFollowing: ownerId ? knownAuthorIds.has(ownerId) : false,
      };
    });

  const taggedPool: MilestoneItem[] = [
    ...userPool,
    ...memberCongDongMilestones.map((m) => ({
      ...m,
      feedSource: "cong_dong" as const,
      feedFollowing: true,
    })),
    ...suggestedCongDongMilestones.map((m) => ({
      ...m,
      feedSource: "cong_dong" as const,
      feedFollowing: false,
    })),
    ...orgMilestones.map((m) => ({
      ...m,
      feedSource: "org" as const,
      feedFollowing: true,
    })),
    ...orgSuKienMilestones.map((m) => ({
      ...m,
      feedSource: "org" as const,
      feedFollowing: true,
    })),
    /* Sự kiện org do bạn bè tham gia — coi là "theo dõi" (qua quan hệ bạn bè). */
    ...dedupedFriendSuKien.map((m) => ({
      ...m,
      feedSource: "org" as const,
      feedFollowing: true,
    })),
  ];

  followingPool = filterFeedMilestonesForViewer(taggedPool, viewerId).map((m) => {
    const ownerId = m.postOwnerId ?? m.lensOwnerId ?? null;
    if (m.feedSuggestion) return m;
    if (ownerId && !knownAuthorIds.has(ownerId) && !m.congDongOrg) {
      return { ...m, feedExplore: true as const };
    }
    return m;
  });

  return rankFeedByScore(viewerId, followingPool, rankOptions);
}

async function buildExplorePool(
  viewerId: string,
  friendSet: Set<string>,
  followingSet: Set<string>,
  knownAuthorIds: Set<string>,
): Promise<MilestoneItem[]> {
  const featureLinks = await fetchGlobalFeatureLinkRows();
  const strangerLinks = featureLinks.filter((row) => {
    const ownerId = row.content_cot_moc?.id_nguoi_dung;
    return ownerId ? !knownAuthorIds.has(ownerId) : false;
  });

  const cotMocs = dedupeCotMocs(strangerLinks).filter((cm) =>
    isVisibleCotMoc(cm, viewerId, friendSet, followingSet),
  );

  if (cotMocs.length === 0) return [];

  const ownerIdByCotMoc = new Map(
    cotMocs.map((cm) => [cm.id, cm.id_nguoi_dung]),
  );
  const authorIds = [...new Set(cotMocs.map((cm) => cm.id_nguoi_dung))];

  const admin = createServiceRoleClient();
  const [built, authors] = await Promise.all([
    buildSelfMilestonesForCotMocs(
      admin,
      cotMocs as Parameters<typeof buildSelfMilestonesForCotMocs>[1],
    ),
    loadAuthors(authorIds),
  ]);

  const withLens = applyLensOwners(built, ownerIdByCotMoc, authors);
  return attachSocialState(admin, withLens, viewerId);
}

const fetchWorldJourneyFeedRankedCached = cache(buildWorldJourneyFeedRanked);

const fetchWorldJourneyFeedRankedWideCached = cache((viewerId: string) =>
  buildWorldJourneyFeedRanked(viewerId, {
    poolLimit: FEED_FILTER_POOL_LIMIT,
    softQuota: false,
  }),
);

function fetchWorldJourneyFeedRankedForApi(viewerId: string) {
  return unstable_cache(
    () => buildWorldJourneyFeedRanked(viewerId),
    ["world-journey-feed-ranked", viewerId],
    { revalidate: WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC },
  )();
}

function fetchWorldJourneyFeedRankedWideForApi(viewerId: string) {
  return unstable_cache(
    () =>
      buildWorldJourneyFeedRanked(viewerId, {
        poolLimit: FEED_FILTER_POOL_LIMIT,
        softQuota: false,
      }),
    ["world-journey-feed-ranked-wide", viewerId],
    { revalidate: WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC },
  )();
}

export async function fetchWorldJourneyFeedPage(
  viewerId: string,
  offset = 0,
  limit = WORLD_JOURNEY_FEED_PAGE_SIZE,
  options: WorldJourneyFeedPageOptions = {},
): Promise<WorldJourneyFeedPage> {
  const ranked = feedPageNeedsWidePool(options)
    ? await fetchWorldJourneyFeedRankedWideForApi(viewerId)
    : await fetchWorldJourneyFeedRankedForApi(viewerId);
  const boosted = await withWorldBoostMilestones(ranked, { viewerId });
  const filtered = applyWorldJourneyFeedPageFilters(boosted, options);
  return sliceWorldJourneyFeedPage(filtered, offset, limit);
}

function sliceWorldJourneyFeedPage(
  ranked: MilestoneItem[],
  offset: number,
  limit: number,
): WorldJourneyFeedPage {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), WORLD_JOURNEY_FEED_PAGE_SIZE * 3);
  const page = ranked.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + page.length;

  return {
    milestones: page,
    hasMore: nextOffset < ranked.length,
    nextOffset,
    totalCount: ranked.length,
  };
}

export async function fetchWorldJourneyFeedPageCached(
  viewerId: string,
  offset = 0,
  limit = WORLD_JOURNEY_FEED_PAGE_SIZE,
  options: WorldJourneyFeedPageOptions = {},
): Promise<WorldJourneyFeedPage> {
  const ranked = feedPageNeedsWidePool(options)
    ? await fetchWorldJourneyFeedRankedWideCached(viewerId)
    : await fetchWorldJourneyFeedRankedCached(viewerId);
  const boosted = await withWorldBoostMilestones(ranked, { viewerId });
  const filtered = applyWorldJourneyFeedPageFilters(boosted, options);
  return sliceWorldJourneyFeedPage(filtered, offset, limit);
}

/** Tab Khám phá — chỉ bài Nổi bật toàn cục từ người chưa follow/bạn bè. */
export async function fetchWorldJourneyExploreMilestones(
  viewerId: string,
): Promise<MilestoneItem[]> {
  const [friendIds, followingIds] = await Promise.all([
    listFriends(viewerId),
    listFollowingUserIds(viewerId),
  ]);
  const friendSet = new Set(friendIds);
  const followingSet = new Set(followingIds);
  const knownAuthorIds = new Set<string>([viewerId, ...friendIds, ...followingIds]);

  return filterFeedMilestonesForViewer(
    await buildExplorePool(viewerId, friendSet, followingSet, knownAuthorIds),
    viewerId,
  );
}

/** @deprecated — dùng `fetchWorldJourneyFeedPage`. */
export async function fetchWorldJourneyFeedMilestones(
  viewerId: string,
): Promise<MilestoneItem[]> {
  const page = await fetchWorldJourneyFeedPage(viewerId, 0, FEED_POOL_LIMIT);
  return page.milestones;
}

/** @deprecated alias — dùng `fetchWorldJourneyFeedMilestones`. */
export const fetchWorldJourneyFeedPosts = fetchWorldJourneyFeedMilestones;

export const fetchWorldJourneyFeedMilestonesCached = cache(
  fetchWorldJourneyFeedMilestones,
);

export const fetchWorldJourneyExploreMilestonesCached = cache(
  fetchWorldJourneyExploreMilestones,
);

export const fetchWorldJourneyFeedPostsCached =
  fetchWorldJourneyFeedMilestonesCached;
