import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { loadAuthorBadges } from "@/lib/cong-dong/author-badges";
import {
  getViewerVaiTroInOrg,
} from "@/lib/cong-dong/membership";
import { loadAuthorOrgPostMetaInOrg } from "@/lib/cong-dong/stats";
import {
  canManageCommunity,
  isCongDongCommunityRole,
  pickCommunityVaiTro,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import type { CongDongMemberAdmin } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const COMMUNITY_ROLES: CongDongVaiTro[] = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "thanh_vien",
];

const ASSIGNABLE_ROLES: CongDongVaiTro[] = [
  "thanh_vien",
  "quan_ly_noi_dung",
  "admin",
];

type MemberRow = {
  id: string;
  id_nguoi_dung: string;
  vai_tro: string;
  user_nguoi_dung:
    | {
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }
    | {
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }[]
    | null;
};

function memberProfile(row: MemberRow) {
  const raw = row.user_nguoi_dung;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function mapMember(row: MemberRow): CongDongMemberAdmin | null {
  if (!isCongDongCommunityRole(row.vai_tro)) return null;
  const profile = memberProfile(row);
  if (!profile?.slug) return null;
  return {
    id: row.id,
    userId: row.id_nguoi_dung,
    slug: profile.slug,
    tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
    avatarId: profile.avatar_id,
    vaiTro: row.vai_tro,
    editable: row.vai_tro !== "owner",
    ngheLabel: null,
    soBaiVietTrongNhom: 0,
    baiVietGanNhatLuc: null,
  };
}

async function enrichMembersWithFeedMeta(
  orgId: string,
  members: CongDongMemberAdmin[],
): Promise<CongDongMemberAdmin[]> {
  if (members.length === 0) return members;
  const userIds = members.map((m) => m.userId);
  const [badges, postMeta] = await Promise.all([
    loadAuthorBadges(userIds),
    loadAuthorOrgPostMetaInOrg(orgId, userIds),
  ]);
  return members.map((member) => {
    const badge = badges.get(member.userId);
    const meta = postMeta.get(member.userId);
    return {
      ...member,
      ngheLabel: badge?.ngheLabel ?? null,
      soBaiVietTrongNhom: meta?.count ?? 0,
      baiVietGanNhatLuc: meta?.lastPostAt ?? null,
    };
  });
}

async function assertCanManageMembers(
  actorId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Quyền CINs (trục 1): toàn quyền quản lý thành viên mọi org.
  if (await getCurrentUserIsCinsAdmin()) return { ok: true };

  const vaiTro = await getViewerVaiTroInOrg(actorId, orgId);
  if (!canManageCommunity(vaiTro)) {
    return { ok: false, error: "Chỉ admin cộng đồng mới quản lý thành viên." };
  }
  return { ok: true };
}

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string }>();
  return data;
}

export async function listCongDongMembers(params: {
  orgId: string;
  actorId: string;
}): Promise<
  { ok: true; members: CongDongMemberAdmin[] } | { ok: false; error: string }
> {
  if (!(await getCongDongOrg(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  const auth = await assertCanManageMembers(params.actorId, params.orgId);
  if (!auth.ok) return auth;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id_to_chuc", params.orgId)
    .in("vai_tro", COMMUNITY_ROLES)
    .eq("trang_thai", "active")
    .order("vai_tro", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const byUser = new Map<string, CongDongMemberAdmin>();
  for (const row of data ?? []) {
    const mapped = mapMember(row as MemberRow);
    if (!mapped) continue;
    const existing = byUser.get(mapped.userId);
    if (!existing) {
      byUser.set(mapped.userId, mapped);
      continue;
    }
    const currentRank = COMMUNITY_ROLES.indexOf(existing.vaiTro);
    const nextRank = COMMUNITY_ROLES.indexOf(mapped.vaiTro);
    if (nextRank < currentRank) {
      byUser.set(mapped.userId, mapped);
    }
  }

  const members = [...byUser.values()].sort((a, b) => {
    const roleDiff =
      COMMUNITY_ROLES.indexOf(a.vaiTro) - COMMUNITY_ROLES.indexOf(b.vaiTro);
    if (roleDiff !== 0) return roleDiff;
    return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
  });

  return {
    ok: true,
    members: await enrichMembersWithFeedMeta(params.orgId, members),
  };
}

function normalizeAssignableRole(
  value: string | undefined,
): CongDongVaiTro | null {
  const role = value?.trim();
  if (!role || !ASSIGNABLE_ROLES.includes(role as CongDongVaiTro)) {
    return null;
  }
  return role as CongDongVaiTro;
}

export async function addCongDongMember(params: {
  orgId: string;
  actorId: string;
  userId: string;
  vaiTro?: string;
}): Promise<
  { ok: true; member: CongDongMemberAdmin } | { ok: false; error: string }
> {
  if (!(await getCongDongOrg(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  const auth = await assertCanManageMembers(params.actorId, params.orgId);
  if (!auth.ok) return auth;

  const nextRole = normalizeAssignableRole(params.vaiTro) ?? "thanh_vien";
  const admin = createServiceRoleClient();

  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", params.userId)
    .maybeSingle<{
      id: string;
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  if (!profile?.slug) {
    return { ok: false, error: "Không tìm thấy người dùng." };
  }

  const { data: existingRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, vai_tro")
    .eq("id_to_chuc", params.orgId)
    .eq("id_nguoi_dung", params.userId)
    .in("vai_tro", COMMUNITY_ROLES);

  const rows = existingRows ?? [];
  if (rows.some((row) => row.vai_tro === "owner")) {
    return { ok: false, error: "Không thể thay đổi quyền chủ sở hữu hệ thống." };
  }

  const communityRow = rows.find((row) =>
    isCongDongCommunityRole(row.vai_tro as string),
  );

  if (communityRow) {
    const { error } = await admin
      .from("user_thanh_vien_to_chuc")
      .update({ vai_tro: nextRole })
      .eq("id", communityRow.id);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      member: (
        await enrichMembersWithFeedMeta(params.orgId, [
          {
            id: communityRow.id,
            userId: profile.id,
            slug: profile.slug,
            tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
            avatarId: profile.avatar_id,
            vaiTro: nextRole,
            editable: true,
            ngheLabel: null,
            soBaiVietTrongNhom: 0,
            baiVietGanNhatLuc: null,
          },
        ])
      )[0]!,
    };
  }

  const { data: inserted, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .insert({
      id_to_chuc: params.orgId,
      id_nguoi_dung: params.userId,
      vai_tro: nextRole,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không thêm được thành viên." };
  }

  return {
    ok: true,
    member: (
      await enrichMembersWithFeedMeta(params.orgId, [
        {
          id: inserted.id,
          userId: profile.id,
          slug: profile.slug,
          tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
          avatarId: profile.avatar_id,
          vaiTro: nextRole,
          editable: true,
          ngheLabel: null,
          soBaiVietTrongNhom: 0,
          baiVietGanNhatLuc: null,
        },
      ])
    )[0]!,
  };
}

export async function addCongDongMemberBySlug(params: {
  orgId: string;
  actorId: string;
  slug: string;
  vaiTro?: string;
}): Promise<
  { ok: true; member: CongDongMemberAdmin } | { ok: false; error: string }
> {
  const slug = params.slug.trim().toLowerCase();
  if (!slug) return { ok: false, error: "Nhập slug CINs của thành viên." };

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    return { ok: false, error: "Không tìm thấy tài khoản với slug này." };
  }

  return addCongDongMember({
    orgId: params.orgId,
    actorId: params.actorId,
    userId: profile.id,
    vaiTro: params.vaiTro,
  });
}

/**
 * Bàn giao quyền sở hữu cộng đồng cho thành viên khác.
 * Chỉ owner hiện tại (hoặc CINs admin). Owner cũ → admin; người nhận → owner.
 */
export async function transferCongDongOwnership(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
  confirmSlug: string;
}): Promise<
  { ok: true; members: CongDongMemberAdmin[] } | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten")
    .eq("id", params.orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string; slug: string; ten: string }>();
  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  if (
    params.confirmSlug.trim().toLowerCase() !== org.slug.trim().toLowerCase()
  ) {
    return { ok: false, error: "Tên xác nhận không khớp đường dẫn cộng đồng." };
  }

  const isCinsAdmin = await getCurrentUserIsCinsAdmin();
  const actorRole = await getViewerVaiTroInOrg(params.actorId, params.orgId);
  if (actorRole !== "owner" && !isCinsAdmin) {
    return { ok: false, error: "Chỉ chủ sở hữu mới bàn giao quyền sở hữu." };
  }

  const { data: target } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, vai_tro, trang_thai")
    .eq("id", params.membershipId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      vai_tro: string;
      trang_thai: string;
    }>();

  if (!target || !isCongDongCommunityRole(target.vai_tro)) {
    return { ok: false, error: "Không tìm thấy thành viên." };
  }
  if (target.trang_thai !== "active") {
    return { ok: false, error: "Chỉ bàn giao được cho thành viên đã tham gia." };
  }
  if (target.vai_tro === "owner") {
    return { ok: false, error: "Thành viên này đã là chủ sở hữu." };
  }
  if (target.id_nguoi_dung === params.actorId && !isCinsAdmin) {
    return { ok: false, error: "Không thể bàn giao cho chính mình." };
  }

  const { error: demoteError } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: "admin" })
    .eq("id_to_chuc", params.orgId)
    .eq("vai_tro", "owner");
  if (demoteError) {
    return { ok: false, error: demoteError.message };
  }

  const { error: promoteError } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: "owner", trang_thai: "active" })
    .eq("id", target.id);
  if (promoteError) {
    return { ok: false, error: promoteError.message };
  }

  const refreshed = await listCongDongMembers({
    orgId: params.orgId,
    actorId: params.actorId,
  });
  if (!refreshed.ok) return refreshed;
  return { ok: true, members: refreshed.members };
}

export async function updateCongDongMemberRole(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
  vaiTro: string;
}): Promise<
  { ok: true; member: CongDongMemberAdmin } | { ok: false; error: string }
> {
  if (!(await getCongDongOrg(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  const auth = await assertCanManageMembers(params.actorId, params.orgId);
  if (!auth.ok) return auth;

  const nextRole = normalizeAssignableRole(params.vaiTro);
  if (!nextRole) {
    return { ok: false, error: "Vai trò không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id", params.membershipId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle<MemberRow>();

  if (!row) return { ok: false, error: "Không tìm thấy thành viên." };
  if (row.vai_tro === "owner") {
    return { ok: false, error: "Không thể đổi quyền chủ sở hữu hệ thống." };
  }
  if (!isCongDongCommunityRole(row.vai_tro)) {
    return { ok: false, error: "Vai trò không thuộc cộng đồng." };
  }

  if (
    params.actorId === row.id_nguoi_dung &&
    pickCommunityVaiTro([row.vai_tro]) === "admin" &&
    nextRole !== "admin"
  ) {
    const { count } = await admin
      .from("user_thanh_vien_to_chuc")
      .select("id", { count: "exact", head: true })
      .eq("id_to_chuc", params.orgId)
      .eq("vai_tro", "admin")
      .neq("id_nguoi_dung", params.actorId);
    if ((count ?? 0) === 0) {
      return {
        ok: false,
        error: "Cần ít nhất một admin khác trước khi hạ quyền của bạn.",
      };
    }
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: nextRole })
    .eq("id", params.membershipId);

  if (error) return { ok: false, error: error.message };

  const mapped = mapMember({ ...row, vai_tro: nextRole });
  if (!mapped) return { ok: false, error: "Không cập nhật được vai trò." };
  return {
    ok: true,
    member: (await enrichMembersWithFeedMeta(params.orgId, [mapped]))[0]!,
  };
}
