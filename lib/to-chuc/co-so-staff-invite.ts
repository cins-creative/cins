import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";

import { coSoAssignableRoleLabel, isCoSoStaffRole } from "./co-so-vai-tro";

export type PendingCoSoStaffInviteNotification = {
  notificationId: string;
  membershipId: string;
  orgId: string;
  orgSlug: string;
  orgTen: string;
  loaiToChuc: string;
  vaiTro: string;
  vaiTroLabel: string;
  inviterName: string;
  inviterSlug?: string | null;
  inviterAvatarUrl?: string | null;
  taoLuc?: string;
};

type InvitePayload = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  loaiToChuc?: string;
  vaiTro: string;
  inviterId?: string;
  inviterName: string;
  inviterSlug?: string;
  inviterAvatarUrl?: string | null;
};

const LOAI_DOI_TUONG = "co_so_staff_invite";

/** Loại org dùng chung hệ thống staff-invite (co-so + studio). */
const STAFF_INVITE_ORG_TYPES = ["co_so_dao_tao", "studio", "doanh_nghiep"];

function parseInvitePayload(raw: string): InvitePayload | null {
  try {
    const parsed = JSON.parse(raw) as InvitePayload;
    if (!parsed?.orgId || !parsed?.orgSlug || !parsed?.orgTen) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function notifyCoSoStaffInvite(params: {
  membershipId: string;
  inviteeId: string;
  orgId: string;
  orgSlug: string;
  orgTen: string;
  loaiToChuc?: string;
  vaiTro: string;
  inviterId: string;
  inviterName: string;
  inviterSlug?: string;
  inviterAvatarUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const payload: InvitePayload = {
    orgId: params.orgId,
    orgSlug: params.orgSlug,
    orgTen: params.orgTen,
    loaiToChuc: params.loaiToChuc ?? "co_so_dao_tao",
    vaiTro: params.vaiTro,
    inviterId: params.inviterId,
    inviterName: params.inviterName,
    inviterSlug: params.inviterSlug,
    inviterAvatarUrl: params.inviterAvatarUrl ?? null,
  };
  const vaiTroLabel = coSoAssignableRoleLabel(
    params.vaiTro as Parameters<typeof coSoAssignableRoleLabel>[0],
  );
  const noiDung = `${params.inviterName} mời bạn tham gia quản trị «${params.orgTen}» với vai trò ${vaiTroLabel}.`;
  const noiDungAi = JSON.stringify(payload);

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", params.inviteeId)
    .eq("loai_doi_tuong", LOAI_DOI_TUONG)
    .eq("id_doi_tuong", params.membershipId)
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
    return { ok: true };
  }

  const inserted = await insertSocialThongBao(admin, {
    nguoi_nhan: params.inviteeId,
    loai: "hanh_dong",
    noi_dung: noiDung,
    loai_doi_tuong: LOAI_DOI_TUONG,
    id_doi_tuong: params.membershipId,
    noi_dung_ai: noiDungAi,
  });
  if (!inserted.ok) return inserted;
  return { ok: true };
}

export async function loadPendingCoSoStaffInvites(
  viewerId: string,
  options: { limit?: number } = {},
): Promise<PendingCoSoStaffInviteNotification[]> {
  return listPendingCoSoStaffInviteNotifications(viewerId, options);
}

export async function listPendingCoSoStaffInviteNotifications(
  viewerId: string,
  options: { limit?: number } = {},
): Promise<PendingCoSoStaffInviteNotification[]> {
  const limit = options.limit ?? 10;
  const admin = createServiceRoleClient();

  const { data: membershipRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, vai_tro, trang_thai, id_to_chuc, org_to_chuc: id_to_chuc ( id, slug, ten, loai_to_chuc )",
    )
    .eq("id_nguoi_dung", viewerId)
    .eq("trang_thai", "pending")
    .in("vai_tro", [
      "admin",
      "quan_ly_noi_dung",
      "quan_ly_tuyen_sinh",
      "giao_vien",
      "nhan_vien",
    ])
    .order("id", { ascending: false })
    .limit(limit);

  const out: PendingCoSoStaffInviteNotification[] = [];
  const payloads: Array<InvitePayload | null> = [];
  for (const row of membershipRows ?? []) {
    if (!isCoSoStaffRole(row.vai_tro as string)) continue;
    const orgRaw = row.org_to_chuc as
      | { id: string; slug: string; ten: string; loai_to_chuc: string }
      | { id: string; slug: string; ten: string; loai_to_chuc: string }[]
      | null;
    const org = Array.isArray(orgRaw) ? (orgRaw[0] ?? null) : orgRaw;
    if (!org?.slug || !STAFF_INVITE_ORG_TYPES.includes(org.loai_to_chuc)) {
      continue;
    }

    const membershipId = row.id as string;
    const { data: notifyRow } = await admin
      .from("social_thong_bao")
      .select("id, noi_dung_ai, tao_luc")
      .eq("nguoi_nhan", viewerId)
      .eq("loai_doi_tuong", LOAI_DOI_TUONG)
      .eq("id_doi_tuong", membershipId)
      .is("xu_ly_luc", null)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; noi_dung_ai: string | null; tao_luc: string }>();

    const payload = parseInvitePayload(String(notifyRow?.noi_dung_ai ?? ""));
    payloads.push(payload);

    out.push({
      notificationId: notifyRow?.id ?? membershipId,
      membershipId,
      orgId: org.id,
      orgSlug: org.slug,
      orgTen: org.ten,
      loaiToChuc: org.loai_to_chuc,
      vaiTro: row.vai_tro as string,
      vaiTroLabel: coSoAssignableRoleLabel(
        row.vai_tro as Parameters<typeof coSoAssignableRoleLabel>[0],
      ),
      inviterName: payload?.inviterName ?? "Quản trị viên",
      inviterSlug: payload?.inviterSlug ?? null,
      inviterAvatarUrl: payload?.inviterAvatarUrl ?? null,
      taoLuc: notifyRow?.tao_luc,
    });
  }

  return enrichInviterAvatars(out, payloads);
}

async function enrichInviterAvatars(
  items: PendingCoSoStaffInviteNotification[],
  payloads: Array<InvitePayload | null>,
): Promise<PendingCoSoStaffInviteNotification[]> {
  const admin = createServiceRoleClient();
  const inviterIds = [
    ...new Set(
      payloads
        .map((payload, index) =>
          !items[index]?.inviterAvatarUrl && payload?.inviterId
            ? payload.inviterId
            : null,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const legacyNames = [
    ...new Set(
      items
        .filter((item) => !item.inviterAvatarUrl && !item.inviterSlug)
        .map((item) => item.inviterName.trim())
        .filter(Boolean),
    ),
  ];

  const avatarByUserId = new Map<string, string | null>();
  const avatarByDisplayName = new Map<string, string | null>();
  const slugByDisplayName = new Map<string, string>();

  if (inviterIds.length > 0) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", inviterIds);
    for (const user of users ?? []) {
      avatarByUserId.set(
        user.id as string,
        getAvatarUrl((user.avatar_id as string | null) ?? null) ?? null,
      );
      const name = (user.ten_hien_thi as string | null)?.trim();
      if (name) {
        avatarByDisplayName.set(
          name,
          getAvatarUrl((user.avatar_id as string | null) ?? null) ?? null,
        );
        slugByDisplayName.set(name, user.slug as string);
      }
    }
  }

  if (legacyNames.length > 0) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("slug, ten_hien_thi, avatar_id")
      .in("ten_hien_thi", legacyNames);
    for (const user of users ?? []) {
      const name = (user.ten_hien_thi as string | null)?.trim();
      if (!name) continue;
      avatarByDisplayName.set(
        name,
        getAvatarUrl((user.avatar_id as string | null) ?? null) ?? null,
      );
      slugByDisplayName.set(name, user.slug as string);
    }
  }

  return items.map((item, index) => {
    if (item.inviterAvatarUrl) return item;
    const payload = payloads[index];
    const fromId = payload?.inviterId
      ? avatarByUserId.get(payload.inviterId)
      : undefined;
    const fromName = avatarByDisplayName.get(item.inviterName.trim());
    const slug =
      item.inviterSlug ??
      payload?.inviterSlug ??
      slugByDisplayName.get(item.inviterName.trim()) ??
      null;
    return {
      ...item,
      inviterSlug: slug,
      inviterAvatarUrl: fromId ?? fromName ?? null,
    };
  });
}

export async function respondCoSoStaffInvite(params: {
  viewerId: string;
  membershipId: string;
  action: "accept" | "decline";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_to_chuc, id_nguoi_dung, vai_tro, trang_thai")
    .eq("id", params.membershipId)
    .eq("id_nguoi_dung", params.viewerId)
    .maybeSingle<{
      id: string;
      id_to_chuc: string;
      id_nguoi_dung: string;
      vai_tro: string;
      trang_thai: string;
    }>();

  if (!row || !isCoSoStaffRole(row.vai_tro)) {
    return { ok: false, error: "Không tìm thấy lời mời." };
  }
  if (row.trang_thai !== "pending") {
    return { ok: false, error: "Lời mời đã được xử lý." };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", row.id_to_chuc)
    .in("loai_to_chuc", STAFF_INVITE_ORG_TYPES)
    .maybeSingle<{ id: string }>();
  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy tổ chức." };
  }

  const now = new Date().toISOString();
  if (params.action === "accept") {
    const { error } = await admin
      .from("user_thanh_vien_to_chuc")
      .update({ trang_thai: "active" })
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin
      .from("user_thanh_vien_to_chuc")
      .delete()
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };
  }

  await admin
    .from("social_thong_bao")
    .update({ xu_ly_luc: now, da_doc: true })
    .eq("nguoi_nhan", params.viewerId)
    .eq("loai_doi_tuong", LOAI_DOI_TUONG)
    .eq("id_doi_tuong", params.membershipId)
    .is("xu_ly_luc", null);

  return { ok: true };
}
