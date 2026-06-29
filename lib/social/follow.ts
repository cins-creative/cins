import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logFollowRequestHandled } from "@/lib/social/friend-notifications";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

export { logFollowRequestHandled };

import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import type {
  CommentNotification,
  FollowAcceptedNotification,
  FollowHandledNotification,
  FollowTargetType,
  PendingFollowRequest,
} from "@/lib/social/types";

const ENTITY_FOLLOW_DB_VALUE: Record<Exclude<FollowTargetType, "user">, string> = {
  tag: "bai_viet",
  org: "to_chuc",
};

const USER_FOLLOW_DB_LOAI = "nguoi_dung";

/** Follow tag/org — legacy alias. */
export type EntityFollowLoai = Exclude<FollowTargetType, "user">;

export type FollowStatus = {
  dang_theo_doi: boolean;
};

function followDbLoai(loai: FollowTargetType): string {
  if (loai === "user") return USER_FOLLOW_DB_LOAI;
  return ENTITY_FOLLOW_DB_VALUE[loai];
}

export function parseEntityFollowLoai(raw: string | null): EntityFollowLoai | null {
  if (raw === "tag" || raw === "bai_viet") return "tag";
  if (raw === "org" || raw === "to_chuc") return "org";
  return null;
}

export function parseFollowTargetLoai(raw: string | null): FollowTargetType | null {
  if (raw === "user" || raw === "nguoi_dung") return "user";
  return parseEntityFollowLoai(raw);
}

async function isFollowingTarget(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<boolean> {
  if (loai === "user" && followerId === targetId) return false;
  const admin = createServiceRoleClient();
  const dbLoai = followDbLoai(loai);
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_nguoi_theo_doi")
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", targetId)
    .eq("loai_doi_tuong", dbLoai)
    .maybeSingle();
  return Boolean(data);
}

async function followTargetRow(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (loai === "user") {
    if (followerId === targetId) {
      return { ok: false, error: "Không thể theo dõi chính mình." };
    }
    const admin = createServiceRoleClient();
    const { data: target } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();
    if (!target) return { ok: false, error: "Không tìm thấy người dùng." };
  }

  const admin = createServiceRoleClient();
  const dbLoai = followDbLoai(loai);
  const { error } = await admin.from("user_theo_doi").insert({
    id_nguoi_theo_doi: followerId,
    id_doi_tuong: targetId,
    loai_doi_tuong: dbLoai,
  });
  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function unfollowTargetRow(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const dbLoai = followDbLoai(loai);
  const { error } = await admin
    .from("user_theo_doi")
    .delete()
    .eq("id_nguoi_theo_doi", followerId)
    .eq("id_doi_tuong", targetId)
    .eq("loai_doi_tuong", dbLoai);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function isFollowing(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<boolean> {
  return isFollowingTarget(followerId, targetId, loai);
}

export async function getFollowStatus(
  viewerId: string | null,
  targetId: string,
  loai: FollowTargetType,
): Promise<FollowStatus> {
  if (!viewerId) return { dang_theo_doi: false };
  const dang_theo_doi = await isFollowingTarget(viewerId, targetId, loai);
  return { dang_theo_doi };
}

export async function followTarget(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return followTargetRow(followerId, targetId, loai);
}

export async function unfollowTarget(
  followerId: string,
  targetId: string,
  loai: FollowTargetType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return unfollowTargetRow(followerId, targetId, loai);
}

export async function notifyFollowAccepted(
  requesterId: string,
  accepterId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: requesterId,
    loai: "thong_tin",
    noi_dung: "Đã chấp nhận kết bạn",
    noi_dung_ai: accepterId,
    loai_doi_tuong: "follow_accepted",
    id_doi_tuong: accepterId,
  });
  if (!result.ok) console.error("[notifyFollowAccepted]", result.error);
}

const NOTIFY_PROFILE_STUB = {
  coverUrl: null,
  bio: null,
  giaiDoan: null,
  tinhThanh: null,
  stats: { cotMoc: 0, tacPham: 0, banBe: 0, toChucXacThuc: 0 },
} as const;

/** Profile tối giản cho dropdown thông báo — không query stats/cover. */
export async function loadNotifyProfiles(
  admin: ReturnType<typeof createServiceRoleClient>,
  userIds: string[],
): Promise<PendingFollowRequest[]> {
  if (userIds.length === 0) return [];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);
  return (profiles ?? []).map((p) => ({
    idNguoiDung: p.id as string,
    slug: (p.slug as string) ?? "",
    tenHienThi: (p.ten_hien_thi as string | null) || (p.slug as string) || "User",
    avatarUrl: getAvatarUrl((p.avatar_id as string | null) ?? null),
    ...NOTIFY_PROFILE_STUB,
  }));
}

export async function listFollowAcceptedNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<FollowAcceptedNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", "follow_accepted")
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;

  const actorIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (actorIds.length === 0) return [];

  const profiles = await loadNotifyProfiles(admin, actorIds);
  const byId = new Map(profiles.map((profile) => [profile.idNguoiDung, profile]));
  return (rows ?? [])
    .map((row) => {
      const actorId = row.id_doi_tuong as string | null;
      const profile = actorId ? byId.get(actorId) : null;
      if (!profile) return null;
      return {
        ...profile,
        notificationId: String(row.id ?? actorId),
        taoLuc: (row.tao_luc as string | null) ?? undefined,
        daDoc: Boolean(row.da_doc),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function parseCommentNotifyCount(noiDung: string | null | undefined): number {
  if (!noiDung) return 1;
  const match = noiDung.match(/^(\d+)\s+/);
  if (match) return Math.max(1, Number.parseInt(match[1] ?? "1", 10));
  return 1;
}

/**
 * Chủ cột mốc: tối đa 1 thông báo chưa đọc / (người bình luận × bài viết).
 * Bình luận tiếp theo của cùng người chỉ cập nhật count + đẩy lên đầu.
 */
export async function notifyMilestoneComment(params: {
  ownerId: string;
  commenterId: string;
  commentId: string;
  milestoneId: string;
}): Promise<void> {
  void params.commentId;
  if (params.ownerId === params.commenterId) return;
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id, noi_dung")
    .eq("nguoi_nhan", params.ownerId)
    .eq("loai_doi_tuong", "cot_moc_comment")
    .eq("id_doi_tuong", params.milestoneId)
    .eq("noi_dung_ai", params.commenterId)
    .eq("da_doc", false)
    .maybeSingle<{ id: string; noi_dung: string | null }>();

  if (existing?.id) {
    const next = parseCommentNotifyCount(existing.noi_dung) + 1;
    const { error } = await admin
      .from("social_thong_bao")
      .update({
        noi_dung: `${next} bình luận mới trên bài viết`,
        tao_luc: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) console.error("[notifyMilestoneComment] update", error.message);
    return;
  }

  const { data: legacyComments } = await admin
    .from("social_binh_luan")
    .select("id")
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", params.milestoneId)
    .eq("nguoi_binh_luan", params.commenterId)
    .returns<Array<{ id: string }>>();
  const legacyCommentIds = (legacyComments ?? []).map((row) => row.id);
  if (legacyCommentIds.length > 0) {
    const { data: legacyNotify } = await admin
      .from("social_thong_bao")
      .select("id, noi_dung")
      .eq("nguoi_nhan", params.ownerId)
      .eq("loai_doi_tuong", "cot_moc_comment")
      .eq("noi_dung_ai", params.commenterId)
      .eq("da_doc", false)
      .in("id_doi_tuong", legacyCommentIds)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; noi_dung: string | null }>();

    if (legacyNotify?.id) {
      const next = parseCommentNotifyCount(legacyNotify.noi_dung) + 1;
      const { error } = await admin
        .from("social_thong_bao")
        .update({
          id_doi_tuong: params.milestoneId,
          noi_dung: `${next} bình luận mới trên bài viết`,
          tao_luc: new Date().toISOString(),
        })
        .eq("id", legacyNotify.id);
      if (error) console.error("[notifyMilestoneComment] migrate", error.message);
      return;
    }
  }

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: params.ownerId,
    loai: "thong_tin",
    noi_dung: "Có bình luận mới trên cột mốc",
    noi_dung_ai: params.commenterId,
    loai_doi_tuong: "cot_moc_comment",
    id_doi_tuong: params.milestoneId,
    da_doc: false,
  });
  if (!result.ok) console.error("[notifyMilestoneComment]", result.error);
}

export async function listCommentNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<CommentNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung_ai, noi_dung, tao_luc, da_doc, loai_doi_tuong")
    .eq("nguoi_nhan", viewerId)
    .in("loai_doi_tuong", ["cot_moc_comment", "binh_luan_tra_loi", "mention_binh_luan"])
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;

  const objectIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (objectIds.length === 0) return [];

  const { data: directMilestones } = await admin
    .from("content_cot_moc")
    .select("id")
    .in("id", objectIds)
    .returns<Array<{ id: string }>>();
  const directMilestoneIds = new Set(
    (directMilestones ?? []).map((m) => m.id as string),
  );

  const legacyCommentIds = objectIds.filter((id) => !directMilestoneIds.has(id));
  const { data: commentRows } = legacyCommentIds.length
    ? await admin
        .from("social_binh_luan")
        .select("id, id_doi_tuong, nguoi_binh_luan")
        .in("id", legacyCommentIds)
        .eq("loai_doi_tuong", "cot_moc")
    : { data: [] as Array<{ id: string; id_doi_tuong: string; nguoi_binh_luan: string }> };

  const commentById = new Map(
    (commentRows ?? []).map((c) => [c.id as string, c]),
  );

  const resolveMilestoneId = (objectId: string | null): string | null => {
    if (!objectId) return null;
    if (directMilestoneIds.has(objectId)) return objectId;
    return commentById.get(objectId)?.id_doi_tuong ?? null;
  };

  const commenterIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => {
          const objectId = row.id_doi_tuong as string | null;
          const viaComment = objectId ? commentById.get(objectId) : undefined;
          const fromRow = row.noi_dung_ai as string | null;
          return fromRow ?? viaComment?.nguoi_binh_luan ?? null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const milestoneIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => resolveMilestoneId(row.id_doi_tuong as string | null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (commenterIds.length === 0 || milestoneIds.length === 0) return [];

  const [profiles, { data: milestones }, { data: links }] = await Promise.all([
    loadNotifyProfiles(admin, commenterIds),
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

  const mapped = (rows ?? [])
    .map((row) => {
      const objectId = row.id_doi_tuong as string | null;
      if (!objectId) return null;
      const viaComment = commentById.get(objectId);
      const milestoneId = resolveMilestoneId(objectId);
      if (!milestoneId) return null;
      const commenterId =
        (row.noi_dung_ai as string | null) ??
        viaComment?.nguoi_binh_luan ??
        null;
      const commenter = commenterId ? profileById.get(commenterId) : null;
      const milestone = milestoneById.get(milestoneId);
      if (!commenter || !milestone) return null;
      const link = firstLinkByMilestone.get(milestoneId);
      return {
        ...commenter,
        notificationId: (row.id as string | null) ?? `${commenter.idNguoiDung}:${milestoneId}`,
        milestoneId,
        postTitle: milestone.tieu_de || "Bài viết",
        postSlug: link?.content_tac_pham?.slug ?? null,
        ownerSlug: ownerSlugById.get(milestone.id_nguoi_dung) ?? null,
        commentCount: parseCommentNotifyCount(row.noi_dung as string | null),
        kind:
          row.loai_doi_tuong === "binh_luan_tra_loi"
            ? ("reply" as const)
            : row.loai_doi_tuong === "mention_binh_luan"
              ? ("mention" as const)
              : ("milestone" as const),
        taoLuc: (row.tao_luc as string | null) ?? undefined,
        daDoc: Boolean(row.da_doc),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const deduped = new Map<string, (typeof mapped)[number]>();
  for (const item of mapped) {
    const key = `${item.kind ?? "milestone"}:${item.idNguoiDung}:${item.milestoneId}`;
    const prev = deduped.get(key);
    if (!prev) {
      deduped.set(key, item);
      continue;
    }
    const prevTime = prev.taoLuc ?? "";
    const itemTime = item.taoLuc ?? "";
    const mergedCount = (prev.commentCount ?? 1) + (item.commentCount ?? 1);
    if (itemTime >= prevTime) {
      deduped.set(key, {
        ...item,
        commentCount: mergedCount,
        notificationId: item.notificationId,
      });
    } else {
      deduped.set(key, {
        ...prev,
        commentCount: mergedCount,
      });
    }
  }

  return [...deduped.values()].sort((a, b) =>
    (b.taoLuc ?? "").localeCompare(a.taoLuc ?? ""),
  );
}

export async function loadFollowProfiles(
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
    { data: friendRows },
  ] = await Promise.all([
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
        .from("user_ket_ban")
        .select("id_nguoi_gui, id_nguoi_nhan")
        .eq("trang_thai", "accepted")
        .or(
          `id_nguoi_gui.in.(${userIds.join(",")}),id_nguoi_nhan.in.(${userIds.join(",")})`,
        )
        .returns<Array<{ id_nguoi_gui: string; id_nguoi_nhan: string }>>(),
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
  const userIdSet = new Set(userIds);
  for (const row of friendRows ?? []) {
    if (userIdSet.has(row.id_nguoi_gui)) {
      out.get(row.id_nguoi_gui)!.banBe += 1;
    }
    if (userIdSet.has(row.id_nguoi_nhan)) {
      out.get(row.id_nguoi_nhan)!.banBe += 1;
    }
  }
  return out;
}

export async function listFollowHandledNotifications(
  viewerId: string,
  options: { limit?: number } = {},
): Promise<FollowHandledNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung_ai, xu_ly_luc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", "follow_request_handled")
    .order("xu_ly_luc", { ascending: false })
    .limit(rowLimit);

  const requesterIds = [
    ...new Set(
      (rows ?? [])
        .map((row) => row.id_doi_tuong as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (requesterIds.length === 0) return [];

  const profiles = await loadNotifyProfiles(admin, requesterIds);
  const byId = new Map(profiles.map((p) => [p.idNguoiDung, p]));

  return (rows ?? [])
    .map((row) => {
      const requesterId = row.id_doi_tuong as string | null;
      const profile = requesterId ? byId.get(requesterId) : null;
      const action = row.noi_dung_ai as string | null;
      if (!profile || (action !== "accept" && action !== "decline")) return null;
      return {
        ...profile,
        notificationId: row.id as string,
        action,
        xuLyLuc: (row.xu_ly_luc as string | null) ?? "",
      };
    })
    .filter((item): item is FollowHandledNotification => item !== null);
}
