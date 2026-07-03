import "server-only";

import { cache } from "react";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { isVisibleOnWorldJourneyFeed } from "@/lib/cins/worldJourneyFeedVisibility";
import {
  attachSocialState,
  buildSelfMilestonesForCotMocs,
} from "@/lib/journey/milestones-fetch";
import { getAvatarUrl } from "@/lib/journey/profile";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";
import { listFriends } from "@/lib/social/ket-ban";
import { demLuotXemCuaViewer } from "@/lib/social/su-kien";
import { loadUserSuKienPhanHoiMap } from "@/lib/to-chuc/su-kien-dang-ky";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  fetchFollowedOrgBaiDangMilestones,
  listFollowingOrgIds,
} from "@/lib/cins/worldJourneyOrgFeed";
import {
  fetchFollowedOrgSuKienMilestones,
  fetchFriendSuggestedSuKienMilestones,
} from "@/lib/cins/worldJourneyOrgSuKienFeed";

const FEED_LIMIT = 50;
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
 * ID đối tượng analytics của 1 milestone — khớp `id_doi_tuong` mà client bắn
 * lên `social_luot_xem`: sự kiện → `suKienId`; bài đăng org → `postId`; còn lại
 * là cột mốc (`cotMocId` ?? `id`). Dùng để tra số lần viewer đã xem.
 */
function analyticsIdOf(m: MilestoneItem): string {
  if (m.orgSuKienRef?.suKienId) return m.orgSuKienRef.suKienId;
  if (m.orgBaiDangRef?.postId) return m.orgBaiDangRef.postId;
  return m.cotMocId ?? m.id;
}

/**
 * Xếp hạng feed: ưu tiên nội dung CHƯA xem / xem ít (số lượt `hien_thi` của
 * viewer thấp) lên trên; cùng số lượt thì giữ thứ tự dòng thời gian
 * (`compareTimelineOrder`). Cắt còn `FEED_LIMIT`.
 */
async function rankFeedByUnseen(
  viewerId: string,
  items: MilestoneItem[],
): Promise<MilestoneItem[]> {
  if (items.length === 0) return [];

  const seen = await demLuotXemCuaViewer(
    viewerId,
    items.map(analyticsIdOf),
  );

  return items
    .slice()
    .sort((a, b) => {
      const sa = seen.get(analyticsIdOf(a)) ?? 0;
      const sb = seen.get(analyticsIdOf(b)) ?? 0;
      if (sa !== sb) return sa - sb;
      return compareTimelineOrder(a, b);
    })
    .slice(0, FEED_LIMIT)
    /* Đính số lượt xem để client giữ đúng thứ tự "chưa xem lên trên" khi
       group-by-year (WorldJourneyFeedTimeline sort lại trong mỗi năm). */
    .map((m) => ({ ...m, viewerSeenCount: seen.get(analyticsIdOf(m)) ?? 0 }));
}

export async function fetchWorldJourneyFeedMilestones(
  viewerId: string,
): Promise<MilestoneItem[]> {
  const [friendIds, followingIds, followingTagIds, followingOrgIds, phanHoiMap] =
    await Promise.all([
      listFriends(viewerId),
      listFollowingUserIds(viewerId),
      listFollowingTagIds(viewerId),
      listFollowingOrgIds(viewerId),
      loadUserSuKienPhanHoiMap(viewerId),
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
  ] = await Promise.all([
    fetchLinkRowsForAuthors(
      [viewerId],
      ["feature", "public", "theo_nhom", "chi_minh"],
    ),
    fetchLinkRowsForAuthors(friendIds, ["feature", "public", "theo_nhom"]),
    fetchLinkRowsForAuthors(followingOnlyIds, ["feature", "public"]),
    fetchGlobalFeatureLinkRows(),
    fetchLinkRowsForFollowedTags(followingTagIds),
    fetchFollowedOrgBaiDangMilestones(followingOrgIds),
    fetchFollowedOrgSuKienMilestones(followingOrgIds, friendIds),
    fetchFriendSuggestedSuKienMilestones(friendIds),
  ]);

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

  if (cotMocs.length === 0 && orgMilestones.length === 0) {
    return rankFeedByUnseen(viewerId, [
      ...orgSuKienMilestones,
      ...friendSuKienSuggestions,
    ]);
  }

  if (cotMocs.length === 0) {
    return rankFeedByUnseen(viewerId, [
      ...orgMilestones,
      ...orgSuKienMilestones,
      ...friendSuKienSuggestions,
    ]);
  }

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
  const withSocial = await attachSocialState(admin, withLens, viewerId);

  const followedSuKienIds = new Set(
    orgSuKienMilestones.map((m) => m.orgSuKienRef?.suKienId).filter(Boolean),
  );
  const dedupedFriendSuKien = friendSuKienSuggestions.filter(
    (m) => !followedSuKienIds.has(m.orgSuKienRef?.suKienId ?? ""),
  );

  return rankFeedByUnseen(viewerId, [
    ...withSocial,
    ...orgMilestones,
    ...orgSuKienMilestones,
    ...dedupedFriendSuKien,
  ]);
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

  const sorted = built.slice().sort(compareTimelineOrder).slice(0, FEED_LIMIT);
  const withLens = applyLensOwners(sorted, ownerIdByCotMoc, authors);
  return attachSocialState(admin, withLens, viewerId);
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
