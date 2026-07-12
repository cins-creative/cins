import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { isThanhVien, joinCongDong } from "@/lib/cong-dong/membership";
import { CONG_DONG_CHE_DO } from "@/lib/cong-dong/constants";
import { listFriends } from "@/lib/social/ket-ban";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { setOrgFollowLevel } from "@/lib/social/org-notify";

export const CONG_DONG_INVITE_LOAI = "cong_dong_invite";

export type CongDongInviteCandidate = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  alreadyMember: boolean;
};

export type PendingCongDongInviteNotification = {
  notificationId: string;
  orgId: string;
  orgSlug: string;
  orgTen: string;
  inviterName: string;
  inviterSlug?: string | null;
  inviterAvatarUrl?: string | null;
  taoLuc?: string;
};

type InvitePayload = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  inviterId: string;
  inviterName: string;
  inviterSlug?: string;
  inviterAvatarUrl?: string | null;
};

const INVITE_BATCH_MAX = 20;

function parseInvitePayload(raw: string | null): InvitePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InvitePayload;
    if (!parsed?.orgId || !parsed?.orgSlug || !parsed?.orgTen) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadCongDongOrg(orgId: string): Promise<{
  id: string;
  slug: string;
  ten: string;
  cheDo: string;
} | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      cau_hinh: unknown;
    }>();
  if (!data) return null;
  const cauHinh =
    data.cau_hinh && typeof data.cau_hinh === "object"
      ? (data.cau_hinh as { che_do?: string })
      : null;
  const cheDo =
    cauHinh?.che_do === CONG_DONG_CHE_DO.RIENG_TU
      ? CONG_DONG_CHE_DO.RIENG_TU
      : CONG_DONG_CHE_DO.CONG_KHAI;
  return {
    id: data.id,
    slug: data.slug,
    ten: data.ten,
    cheDo,
  };
}

/** Bạn bè có thể mời — kèm cờ đã là thành viên. */
export async function listCongDongInviteCandidates(
  viewerId: string,
  orgId: string,
): Promise<
  | { ok: true; friends: CongDongInviteCandidate[]; orgTen: string }
  | { ok: false; error: string; status: number }
> {
  const org = await loadCongDongOrg(orgId);
  if (!org) return { ok: false, error: "Không tìm thấy cộng đồng.", status: 404 };

  const isMember = await isThanhVien(viewerId, orgId);
  if (org.cheDo === CONG_DONG_CHE_DO.RIENG_TU && !isMember) {
    return {
      ok: false,
      error: "Chỉ thành viên mới mời được vào cộng đồng riêng tư.",
      status: 403,
    };
  }

  const friendIds = await listFriends(viewerId);
  if (friendIds.length === 0) {
    return { ok: true, friends: [], orgTen: org.ten };
  }

  const admin = createServiceRoleClient();
  const [{ data: users }, { data: memberRows }] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", friendIds)
      .returns<
        Array<{
          id: string;
          slug: string;
          ten_hien_thi: string | null;
          avatar_id: string | null;
        }>
      >(),
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_nguoi_dung")
      .eq("id_to_chuc", orgId)
      .in("id_nguoi_dung", friendIds)
      .returns<Array<{ id_nguoi_dung: string }>>(),
  ]);

  const memberSet = new Set(
    (memberRows ?? []).map((row) => row.id_nguoi_dung),
  );
  const byId = new Map((users ?? []).map((u) => [u.id, u]));

  const friends: CongDongInviteCandidate[] = friendIds
    .map((id) => byId.get(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => {
      const name = (u.ten_hien_thi || u.slug).trim();
      return {
        id: u.id,
        slug: u.slug,
        tenHienThi: name,
        avatarUrl: getAvatarUrl(u.avatar_id),
        alreadyMember: memberSet.has(u.id),
      };
    });

  return { ok: true, friends, orgTen: org.ten };
}

export async function notifyCongDongInvite(params: {
  inviteeId: string;
  orgId: string;
  orgSlug: string;
  orgTen: string;
  inviterId: string;
  inviterName: string;
  inviterSlug?: string;
  inviterAvatarUrl?: string | null;
}): Promise<{ ok: true; notificationId: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const payload: InvitePayload = {
    orgId: params.orgId,
    orgSlug: params.orgSlug,
    orgTen: params.orgTen,
    inviterId: params.inviterId,
    inviterName: params.inviterName,
    inviterSlug: params.inviterSlug,
    inviterAvatarUrl: params.inviterAvatarUrl ?? null,
  };
  const noiDung = `${params.inviterName} mời bạn tham gia cộng đồng «${params.orgTen}».`;
  const noiDungAi = JSON.stringify(payload);

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", params.inviteeId)
    .eq("loai_doi_tuong", CONG_DONG_INVITE_LOAI)
    .eq("id_doi_tuong", params.orgId)
    .is("xu_ly_luc", null)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    const { error } = await admin
      .from("social_thong_bao")
      .update({
        noi_dung: noiDung,
        noi_dung_ai: noiDungAi,
        da_doc: false,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, notificationId: existing.id };
  }

  const inserted = await insertSocialThongBao(admin, {
    nguoi_nhan: params.inviteeId,
    loai: "hanh_dong",
    noi_dung: noiDung,
    loai_doi_tuong: CONG_DONG_INVITE_LOAI,
    id_doi_tuong: params.orgId,
    noi_dung_ai: noiDungAi,
  });
  if (!inserted.ok) return inserted;
  return { ok: true, notificationId: inserted.id };
}

export async function inviteFriendsToCongDong(params: {
  viewerId: string;
  orgId: string;
  inviteeIds: string[];
}): Promise<
  | {
      ok: true;
      invited: number;
      skippedMember: number;
      skippedNotFriend: number;
    }
  | { ok: false; error: string; status: number }
> {
  const org = await loadCongDongOrg(params.orgId);
  if (!org) return { ok: false, error: "Không tìm thấy cộng đồng.", status: 404 };

  const isMember = await isThanhVien(params.viewerId, params.orgId);
  if (org.cheDo === CONG_DONG_CHE_DO.RIENG_TU && !isMember) {
    return {
      ok: false,
      error: "Chỉ thành viên mới mời được vào cộng đồng riêng tư.",
      status: 403,
    };
  }

  const uniqueIds = [
    ...new Set(
      params.inviteeIds
        .map((id) => id.trim())
        .filter((id) => id && id !== params.viewerId),
    ),
  ].slice(0, INVITE_BATCH_MAX);

  if (uniqueIds.length === 0) {
    return { ok: false, error: "Chọn ít nhất một người bạn.", status: 400 };
  }

  const friendSet = new Set(await listFriends(params.viewerId));
  const admin = createServiceRoleClient();

  const { data: memberRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", params.orgId)
    .in("id_nguoi_dung", uniqueIds)
    .returns<Array<{ id_nguoi_dung: string }>>();
  const memberSet = new Set((memberRows ?? []).map((r) => r.id_nguoi_dung));

  const { data: inviter } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", params.viewerId)
    .maybeSingle<{
      id: string;
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  if (!inviter) {
    return { ok: false, error: "Không tìm thấy hồ sơ.", status: 400 };
  }

  const inviterName = (inviter.ten_hien_thi || inviter.slug).trim();
  let invited = 0;
  let skippedMember = 0;
  let skippedNotFriend = 0;

  for (const inviteeId of uniqueIds) {
    if (!friendSet.has(inviteeId)) {
      skippedNotFriend += 1;
      continue;
    }
    if (memberSet.has(inviteeId)) {
      skippedMember += 1;
      continue;
    }
    const result = await notifyCongDongInvite({
      inviteeId,
      orgId: org.id,
      orgSlug: org.slug,
      orgTen: org.ten,
      inviterId: inviter.id,
      inviterName,
      inviterSlug: inviter.slug,
      inviterAvatarUrl: getAvatarUrl(inviter.avatar_id),
    });
    if (result.ok) invited += 1;
  }

  return { ok: true, invited, skippedMember, skippedNotFriend };
}

export async function listPendingCongDongInviteNotifications(
  viewerId: string,
  options: { limit?: number } = {},
): Promise<PendingCongDongInviteNotification[]> {
  const limit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung_ai, tao_luc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", CONG_DONG_INVITE_LOAI)
    .is("xu_ly_luc", null)
    .order("tao_luc", { ascending: false })
    .limit(limit)
    .returns<
      Array<{
        id: string;
        id_doi_tuong: string;
        noi_dung_ai: string | null;
        tao_luc: string | null;
      }>
    >();

  if (!rows?.length) return [];

  const out: PendingCongDongInviteNotification[] = [];
  for (const row of rows) {
    const payload = parseInvitePayload(row.noi_dung_ai);
    if (!payload) continue;
    out.push({
      notificationId: row.id,
      orgId: payload.orgId || row.id_doi_tuong,
      orgSlug: payload.orgSlug,
      orgTen: payload.orgTen,
      inviterName: payload.inviterName,
      inviterSlug: payload.inviterSlug ?? null,
      inviterAvatarUrl: payload.inviterAvatarUrl ?? null,
      taoLuc: row.tao_luc ?? undefined,
    });
  }
  return out;
}

export async function respondCongDongInvite(params: {
  viewerId: string;
  notificationId: string;
  action: "accept" | "decline";
}): Promise<{ ok: true; orgSlug?: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("social_thong_bao")
    .select("id, nguoi_nhan, id_doi_tuong, noi_dung_ai, xu_ly_luc")
    .eq("id", params.notificationId)
    .eq("loai_doi_tuong", CONG_DONG_INVITE_LOAI)
    .maybeSingle<{
      id: string;
      nguoi_nhan: string;
      id_doi_tuong: string;
      noi_dung_ai: string | null;
      xu_ly_luc: string | null;
    }>();

  if (!row) return { ok: false, error: "Không tìm thấy lời mời." };
  if (row.nguoi_nhan !== params.viewerId) {
    return { ok: false, error: "Bạn không có quyền xử lý lời mời này." };
  }
  if (row.xu_ly_luc) return { ok: true };

  const payload = parseInvitePayload(row.noi_dung_ai);
  const orgId = payload?.orgId || row.id_doi_tuong;
  const orgSlug = payload?.orgSlug;

  if (params.action === "accept") {
    const joined = await joinCongDong(params.viewerId, orgId);
    if (!joined.ok) return joined;
    await setOrgFollowLevel(params.viewerId, orgId, "chi_noi_bat");
  }

  const { error } = await admin
    .from("social_thong_bao")
    .update({
      xu_ly_luc: new Date().toISOString(),
      da_doc: true,
    })
    .eq("id", row.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true, orgSlug };
}
