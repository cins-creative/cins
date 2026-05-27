import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { FollowTargetType } from "@/lib/social/types";

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
};

export async function getFollowStatus(
  viewerId: string | null,
  targetId: string,
  loai: FollowTargetType,
): Promise<FollowStatus> {
  if (!viewerId || viewerId === targetId) {
    return { dang_theo_doi: false, theo_doi_lai: false };
  }
  const dang_theo_doi = await isFollowing(viewerId, targetId, loai);
  let theo_doi_lai = false;
  if (loai === "user" && dang_theo_doi) {
    theo_doi_lai = await isFollowing(targetId, viewerId, "user");
  }
  return { dang_theo_doi, theo_doi_lai };
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
