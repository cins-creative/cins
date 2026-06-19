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
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

export async function fetchWorldJourneyFeedMilestones(
  viewerId: string,
): Promise<MilestoneItem[]> {
  const [friendIds, followingIds] = await Promise.all([
    listFriends(viewerId),
    listFollowingUserIds(viewerId),
  ]);

  const friendSet = new Set(friendIds);
  const followingSet = new Set(followingIds);
  const followingOnlyIds = followingIds.filter((id) => !friendSet.has(id));
  const knownAuthorIds = new Set<string>([viewerId, ...friendIds, ...followingIds]);

  const [ownLinks, friendLinks, followingLinks, featureLinks] = await Promise.all([
    fetchLinkRowsForAuthors(
      [viewerId],
      ["feature", "public", "theo_nhom", "chi_minh"],
    ),
    fetchLinkRowsForAuthors(friendIds, ["feature", "public", "theo_nhom"]),
    fetchLinkRowsForAuthors(followingOnlyIds, ["feature", "public"]),
    fetchGlobalFeatureLinkRows(),
  ]);

  const strangerFeatureLinks = featureLinks.filter((row) => {
    const ownerId = row.content_cot_moc?.id_nguoi_dung;
    return ownerId ? !knownAuthorIds.has(ownerId) : false;
  });

  const cotMocs = dedupeCotMocs([
    ...ownLinks,
    ...friendLinks,
    ...followingLinks,
    ...strangerFeatureLinks,
  ]).filter((cm) => isVisibleCotMoc(cm, viewerId, friendSet, followingSet));

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

  const sorted = built
    .slice()
    .sort(compareTimelineOrder)
    .slice(0, FEED_LIMIT);

  const withLens = applyLensOwners(sorted, ownerIdByCotMoc, authors);
  return attachSocialState(admin, withLens, viewerId);
}

/** @deprecated alias — dùng `fetchWorldJourneyFeedMilestones`. */
export const fetchWorldJourneyFeedPosts = fetchWorldJourneyFeedMilestones;

export const fetchWorldJourneyFeedMilestonesCached = cache(
  fetchWorldJourneyFeedMilestones,
);

export const fetchWorldJourneyFeedPostsCached =
  fetchWorldJourneyFeedMilestonesCached;
