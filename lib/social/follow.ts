import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import type {
  CommentNotification,
  FollowAcceptedNotification,
  FollowTargetType,
  MutualFriendProfile,
  PendingFollowRequest,
} from "@/lib/social/types";

type FollowRow = {
  id_nguoi_theo_doi: string;
  id_doi_tuong: string;
  loai_doi_tuong: string;
};

const FOLLOW_TARGET_DB_VALUE: Record<FollowTargetType, string> = {
  user: "nguoi_dung",
  tag: "bai_viet",
  org: "to_chuc",
};

/**
 * Hai user follow lẫn nhau (`loai_doi_tuong = 'nguoi_dung'` trong DB).
 * Dùng làm điều kiện tag co-author.
 */
export async function isMutualFollow(
  userA: string,
  userB: string,
): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi, id_doi_tuong")
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
    .or(
      `and(id_nguoi_theo_doi.eq.${userA},id_doi_tuong.eq.${userB}),and(id_nguoi_theo_doi.eq.${userB},id_doi_tuong.eq.${userA})`,
    )
    .returns<FollowRow[]>();

  if (error || !data) return false;
  return data.length >= 2;
}

export async function isFollowing(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const dbLoai = FOLLOW_TARGET_DB_VALUE[loai];
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi")
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", targetId)
    .eq("loai_doi_tuong", dbLoai)
    .maybeSingle();
  return Boolean(data);
}

export type FollowStatus = {
  dang_theo_doi: boolean;
  theo_doi_lai: boolean;
  duoc_theo_doi: boolean;
};

export async function getFollowStatus(
  viewerId: string | null,
  targetId: string,
  loai: FollowTargetType,
): Promise<FollowStatus> {
  if (!viewerId || viewerId === targetId) {
    return { dang_theo_doi: false, theo_doi_lai: false, duoc_theo_doi: false };
  }
  const dang_theo_doi = await isFollowing(viewerId, targetId, loai);
  const duoc_theo_doi =
    loai === "user" ? await isFollowing(targetId, viewerId, "user") : false;
  return { dang_theo_doi, theo_doi_lai: dang_theo_doi && duoc_theo_doi, duoc_theo_doi };
}

export async function followTarget(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (followerId === targetId && loai === "user") {
    return { ok: false, error: "Không thể theo dõi chính mình." };
  }
  const admin = createServiceRoleClient();
  const dbLoai = FOLLOW_TARGET_DB_VALUE[loai];
  const { error } = await admin.from("user_theo_doi").insert({
    id_nguoi_theo_doi: followerId,
    id_doi_tuong: targetId,
    loai_doi_tuong: dbLoai,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export const followUser = followTarget;

export async function unfollowTarget(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const dbLoai = FOLLOW_TARGET_DB_VALUE[loai];
  const { error } = await admin
    .from("user_theo_doi")
    .delete()
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", targetId)
    .eq("loai_doi_tuong", dbLoai);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export const unfollowUser = unfollowTarget;

export async function unfriendUser(
  viewerId: string,
  targetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_theo_doi")
    .delete()
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
    .or(
      `and(id_nguoi_theo_doi.eq.${viewerId},id_doi_tuong.eq.${targetId}),and(id_nguoi_theo_doi.eq.${targetId},id_doi_tuong.eq.${viewerId})`,
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeIncomingUserFollow(
  viewerId: string,
  followerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_theo_doi")
    .delete()
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", viewerId)
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function notifyFollowAccepted(
  requesterId: string,
  accepterId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.from("social_thong_bao").insert({
    nguoi_nhan: requesterId,
    noi_dung_ai: accepterId,
    loai_doi_tuong: "follow_accepted",
    id_doi_tuong: accepterId,
  });
}

export async function listFollowAcceptedNotifications(
  viewerId: string,
): Promise<FollowAcceptedNotification[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, tao_luc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", "follow_accepted")
    .order("tao_luc", { ascending: false })
    .limit(10);

  const actorIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (actorIds.length === 0) return [];

  const profiles = await loadFollowProfiles(admin, actorIds);
  const byId = new Map(profiles.map((profile) => [profile.idNguoiDung, profile]));
  return (rows ?? [])
    .map((row) => {
      const actorId = row.id_doi_tuong as string | null;
      const profile = actorId ? byId.get(actorId) : null;
      if (!profile) return null;
      return {
        ...profile,
        notificationId: (row.id as string | null) ?? actorId,
      };
    })
    .filter((item): item is FollowAcceptedNotification => item !== null);
}

export async function notifyMilestoneComment(params: {
  ownerId: string;
  commenterId: string;
  milestoneId: string;
}): Promise<void> {
  if (params.ownerId === params.commenterId) return;
  const admin = createServiceRoleClient();
  await admin.from("social_thong_bao").insert({
    nguoi_nhan: params.ownerId,
    noi_dung_ai: params.commenterId,
    loai_doi_tuong: "cot_moc_comment",
    id_doi_tuong: params.milestoneId,
  });
}

export async function listCommentNotifications(
  viewerId: string,
): Promise<CommentNotification[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung_ai, tao_luc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", "cot_moc_comment")
    .order("tao_luc", { ascending: false })
    .limit(10);

  const commenterIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.noi_dung_ai as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const milestoneIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (commenterIds.length === 0 || milestoneIds.length === 0) return [];

  const [profiles, { data: milestones }, { data: links }] = await Promise.all([
    loadFollowProfiles(admin, commenterIds),
    admin
      .from("content_cot_moc")
      .select("id, id_nguoi_dung, tieu_de")
      .in("id", milestoneIds)
      .returns<Array<{ id: string; id_nguoi_dung: string; tieu_de: string }>>(),
    admin
      .from("content_tac_pham_thuoc_moc")
      .select("id_cot_moc, thu_tu, content_tac_pham:content_tac_pham(id, slug)")
      .in("id_cot_moc", milestoneIds)
      .order("thu_tu", { ascending: true })
      .returns<
        Array<{
          id_cot_moc: string;
          thu_tu: number;
          content_tac_pham: { id: string; slug: string | null } | null;
        }>
      >(),
  ]);

  const ownerIds = [...new Set((milestones ?? []).map((m) => m.id_nguoi_dung))];
  const { data: owners } = ownerIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug")
        .in("id", ownerIds)
        .returns<Array<{ id: string; slug: string }>>()
    : { data: [] };

  const profileById = new Map(profiles.map((profile) => [profile.idNguoiDung, profile]));
  const milestoneById = new Map((milestones ?? []).map((m) => [m.id, m]));
  const ownerSlugById = new Map((owners ?? []).map((owner) => [owner.id, owner.slug]));
  const firstLinkByMilestone = new Map<string, NonNullable<typeof links>[number]>();
  for (const link of links ?? []) {
    if (!firstLinkByMilestone.has(link.id_cot_moc)) {
      firstLinkByMilestone.set(link.id_cot_moc, link);
    }
  }

  return (rows ?? [])
    .map((row) => {
      const commenterId = row.noi_dung_ai as string | null;
      const milestoneId = row.id_doi_tuong as string | null;
      const commenter = commenterId ? profileById.get(commenterId) : null;
      const milestone = milestoneId ? milestoneById.get(milestoneId) : null;
      if (!commenter || !milestone || !milestoneId) return null;
      const link = firstLinkByMilestone.get(milestoneId);
      return {
        ...commenter,
        notificationId: (row.id as string | null) ?? `${commenter.idNguoiDung}:${milestoneId}`,
        milestoneId,
        postTitle: milestone.tieu_de || "Bài viết",
        postSlug: link?.content_tac_pham?.slug ?? null,
        ownerSlug: ownerSlugById.get(milestone.id_nguoi_dung) ?? null,
      };
    })
    .filter((item): item is CommentNotification => item !== null);
}

/** Người đang follow viewer nhưng viewer chưa follow lại. */
export async function listPendingFollowRequests(
  viewerId: string,
): Promise<PendingFollowRequest[]> {
  const admin = createServiceRoleClient();
  const { data: incoming } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi")
    .eq("id_doi_tuong", viewerId)
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
    .returns<Array<{ id_nguoi_theo_doi: string }>>();

  const incomingIds = [
    ...new Set((incoming ?? []).map((r) => r.id_nguoi_theo_doi)),
  ];
  if (incomingIds.length === 0) return [];

  const { data: outgoing } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
    .in("id_doi_tuong", incomingIds)
    .returns<Array<{ id_doi_tuong: string }>>();
  const alreadyMutual = new Set((outgoing ?? []).map((r) => r.id_doi_tuong));
  const pendingIds = incomingIds.filter((id) => !alreadyMutual.has(id));
  if (pendingIds.length === 0) return [];

  return loadFollowProfiles(admin, pendingIds);
}

export async function listMutualFriendProfiles(
  viewerId: string,
): Promise<MutualFriendProfile[]> {
  const mutualIds = await listMutualFollowUserIds(viewerId);
  if (mutualIds.length === 0) return [];

  const admin = createServiceRoleClient();
  return loadFollowProfiles(admin, mutualIds, 60);
}

async function loadFollowProfiles(
  admin: ReturnType<typeof createServiceRoleClient>,
  userIds: string[],
  limit = 20,
): Promise<PendingFollowRequest[]> {
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, cover_id, bio, giai_doan, tinh_thanh")
    .in("id", userIds)
    .limit(limit);
  const stats = await loadUserSocialStats(
    admin,
    (profiles ?? []).map((p) => p.id as string),
  );

  return (profiles ?? []).map((p) => ({
    idNguoiDung: p.id as string,
    slug: (p.slug as string) ?? "",
    tenHienThi: (p.ten_hien_thi as string | null) || (p.slug as string) || "User",
    avatarUrl: getAvatarUrl((p.avatar_id as string | null) ?? null),
    coverUrl: getProfileCoverUrl((p.cover_id as string | null) ?? null),
    bio: (p.bio as string | null) ?? null,
    giaiDoan: getGiaiDoanLabel((p.giai_doan as Parameters<typeof getGiaiDoanLabel>[0]) ?? null),
    tinhThanh: formatTinhThanh((p.tinh_thanh as string | null) ?? null),
    stats: stats.get(p.id as string) ?? emptySocialStats(),
  }));
}

function emptySocialStats() {
  return { cotMoc: 0, tacPham: 0, banBe: 0, toChucXacThuc: 0 };
}

async function loadUserSocialStats(
  admin: ReturnType<typeof createServiceRoleClient>,
  userIds: string[],
): Promise<Map<string, ReturnType<typeof emptySocialStats>>> {
  const out = new Map<string, ReturnType<typeof emptySocialStats>>();
  for (const id of userIds) out.set(id, emptySocialStats());
  if (userIds.length === 0) return out;

  const [
    { data: tacPhams },
    { data: featuredTacPhams },
    { data: orgRows },
    { data: followsFrom },
    { data: followsTo },
  ] =
    await Promise.all([
      admin
        .from("content_tac_pham")
        .select("id_nguoi_dung")
        .in("id_nguoi_dung", userIds)
        .returns<Array<{ id_nguoi_dung: string }>>(),
      admin
        .from("content_tac_pham_thuoc_moc")
        .select(
          "id_tac_pham, content_cot_moc:content_cot_moc!inner(id_nguoi_dung, che_do_hien_thi)",
        )
        .in("content_cot_moc.id_nguoi_dung", userIds)
        .eq("content_cot_moc.che_do_hien_thi", "feature")
        .returns<
          Array<{
            id_tac_pham: string;
            content_cot_moc: {
              id_nguoi_dung: string;
              che_do_hien_thi: string;
            } | null;
          }>
        >(),
      admin
        .from("user_thanh_vien_to_chuc")
        .select("id_nguoi_dung")
        .in("id_nguoi_dung", userIds)
        .returns<Array<{ id_nguoi_dung: string }>>(),
      admin
        .from("user_theo_doi")
        .select("id_nguoi_theo_doi, id_doi_tuong")
        .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
        .in("id_nguoi_theo_doi", userIds)
        .returns<Array<{ id_nguoi_theo_doi: string; id_doi_tuong: string }>>(),
      admin
        .from("user_theo_doi")
        .select("id_nguoi_theo_doi, id_doi_tuong")
        .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
        .in("id_doi_tuong", userIds)
        .returns<Array<{ id_nguoi_theo_doi: string; id_doi_tuong: string }>>(),
    ]);

  for (const row of tacPhams ?? []) {
    const stat = out.get(row.id_nguoi_dung);
    if (stat) stat.cotMoc += 1;
  }
  const featuredByUser = new Map<string, Set<string>>();
  for (const row of featuredTacPhams ?? []) {
    const ownerId = row.content_cot_moc?.id_nguoi_dung;
    if (!ownerId) continue;
    const ids = featuredByUser.get(ownerId) ?? new Set<string>();
    ids.add(row.id_tac_pham);
    featuredByUser.set(ownerId, ids);
  }
  for (const [ownerId, ids] of featuredByUser) {
    const stat = out.get(ownerId);
    if (stat) stat.tacPham = ids.size;
  }
  for (const row of orgRows ?? []) {
    const stat = out.get(row.id_nguoi_dung);
    if (stat) stat.toChucXacThuc += 1;
  }
  const followingByUser = new Map<string, Set<string>>();
  const followerByUser = new Map<string, Set<string>>();
  for (const id of userIds) {
    followingByUser.set(id, new Set());
    followerByUser.set(id, new Set());
  }
  for (const row of followsFrom ?? []) {
    followingByUser.get(row.id_nguoi_theo_doi)?.add(row.id_doi_tuong);
  }
  for (const row of followsTo ?? []) {
    followerByUser.get(row.id_doi_tuong)?.add(row.id_nguoi_theo_doi);
  }
  for (const id of userIds) {
    const following = followingByUser.get(id) ?? new Set<string>();
    const followers = followerByUser.get(id) ?? new Set<string>();
    const stat = out.get(id);
    if (!stat) continue;
    for (const target of following) {
      if (followers.has(target)) stat.banBe += 1;
    }
  }
  return out;
}

/** User ids mà `viewerId` follow và được follow lại (mutual). */
export async function listMutualFollowUserIds(
  viewerId: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data: following } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
    .returns<Array<{ id_doi_tuong: string }>>();

  const candidateIds = (following ?? []).map((r) => r.id_doi_tuong);
  if (candidateIds.length === 0) return [];

  const { data: reverse } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi")
    .eq("id_doi_tuong", viewerId)
    .eq("loai_doi_tuong", FOLLOW_TARGET_DB_VALUE.user)
    .in("id_nguoi_theo_doi", candidateIds)
    .returns<Array<{ id_nguoi_theo_doi: string }>>();

  return (reverse ?? []).map((r) => r.id_nguoi_theo_doi);
}
