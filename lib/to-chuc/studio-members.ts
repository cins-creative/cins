import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { CoSoStaffVaiTro } from "./co-so-vai-tro";
import {
  canManageCoSoMembers,
  CO_SO_ASSIGNABLE_ROLES,
  isCoSoStaffRole,
} from "./co-so-vai-tro";
import type { CoSoMemberAdmin } from "./co-so-settings-types";
import { getViewerCoSoVaiTro } from "./co-so-membership";
import { notifyCoSoStaffInvite } from "./co-so-staff-invite";

/** Studio dùng chung enum vai trò với cơ sở đào tạo. */
const STUDIO_ORG_TYPES = ["studio", "doanh_nghiep"];

const STUDIO_ADMIN_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
] as const;

const MEMBER_VAI_TRO = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
  "nhan_vien",
];

type MemberRow = {
  id: string;
  id_nguoi_dung: string;
  vai_tro: string;
  trang_thai: string;
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

function mapMember(row: MemberRow, actorId: string): CoSoMemberAdmin | null {
  if (!isCoSoStaffRole(row.vai_tro)) return null;
  const profile = memberProfile(row);
  if (!profile?.slug) return null;
  const trangThai =
    row.trang_thai === "pending" ? "pending" : ("active" as const);
  return {
    id: row.id,
    userId: row.id_nguoi_dung,
    slug: profile.slug,
    tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
    avatarId: profile.avatar_id,
    vaiTro: row.vai_tro as CoSoStaffVaiTro,
    trangThai,
    editable: row.vai_tro !== "owner",
    isSelf: row.id_nguoi_dung === actorId,
  };
}

async function loadStudioOrgMeta(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten")
    .eq("id", orgId)
    .in("loai_to_chuc", STUDIO_ORG_TYPES)
    .maybeSingle<{ id: string; slug: string; ten: string }>();
  return data;
}

export async function isStudioOrgAdmin(
  orgId: string,
  profileId: string,
): Promise<boolean> {
  // Quyền CINs (trục 1) mở khoá vận hành mọi org — độc lập membership.
  if (await getCurrentUserIsCinsAdmin()) return true;

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .in("loai_to_chuc", STUDIO_ORG_TYPES)
    .maybeSingle<{ id: string }>();
  if (!org?.id) return false;

  const { data: member } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", profileId)
    .eq("trang_thai", "active")
    .in("vai_tro", [...STUDIO_ADMIN_ROLES])
    .limit(1)
    .maybeSingle();
  return Boolean(member);
}

async function assertCanManageMembers(
  actorId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Quyền CINs (trục 1): toàn quyền quản lý thành viên mọi org.
  if (await getCurrentUserIsCinsAdmin()) return { ok: true };

  if (!(await isStudioOrgAdmin(orgId, actorId))) {
    return { ok: false, error: "Bạn không có quyền quản trị studio này." };
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!canManageCoSoMembers(vaiTro)) {
    return {
      ok: false,
      error: "Chỉ quản trị viên mới quản lý quyền trên studio.",
    };
  }
  return { ok: true };
}

function normalizeAssignableRole(
  value: string | undefined,
): CoSoStaffVaiTro | null {
  const role = value?.trim();
  if (!role || !CO_SO_ASSIGNABLE_ROLES.includes(role as CoSoStaffVaiTro)) {
    return null;
  }
  return role as CoSoStaffVaiTro;
}

function buildMemberAdmin(
  row: {
    id: string;
    userId: string;
    slug: string;
    tenHienThi: string;
    avatarId: string | null;
    vaiTro: CoSoStaffVaiTro;
    trangThai: CoSoMemberAdmin["trangThai"];
  },
  actorId: string,
): CoSoMemberAdmin {
  return {
    id: row.id,
    userId: row.userId,
    slug: row.slug,
    tenHienThi: row.tenHienThi,
    avatarId: row.avatarId,
    vaiTro: row.vaiTro,
    trangThai: row.trangThai,
    editable: row.vaiTro !== "owner",
    isSelf: row.userId === actorId,
  };
}

async function loadInviterMeta(actorId: string): Promise<{
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", actorId)
    .maybeSingle<{
      id: string;
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();
  const name = data?.ten_hien_thi?.trim() || data?.slug || "Quản trị viên";
  return {
    id: data?.id ?? actorId,
    name,
    slug: data?.slug ?? "",
    avatarUrl: getAvatarUrl(data?.avatar_id ?? null) ?? null,
  };
}

export async function listStudioStaffMembers(params: {
  orgId: string;
  actorId: string;
}): Promise<
  { ok: true; members: CoSoMemberAdmin[] } | { ok: false; error: string }
> {
  if (!(await loadStudioOrgMeta(params.orgId))) {
    return { ok: false, error: "Không tìm thấy studio." };
  }
  if (!(await isStudioOrgAdmin(params.orgId, params.actorId))) {
    return { ok: false, error: "Bạn không có quyền quản trị studio này." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, trang_thai, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id_to_chuc", params.orgId)
    .in("vai_tro", MEMBER_VAI_TRO)
    .in("trang_thai", ["active", "pending"]);

  if (error) return { ok: false, error: error.message };

  const byUser = new Map<string, CoSoMemberAdmin>();
  for (const row of data ?? []) {
    const mapped = mapMember(row as MemberRow, params.actorId);
    if (!mapped) continue;
    const existing = byUser.get(mapped.userId);
    if (!existing) {
      byUser.set(mapped.userId, mapped);
      continue;
    }
    if (existing.trangThai === "active" && mapped.trangThai === "pending") {
      continue;
    }
    if (mapped.trangThai === "active" && existing.trangThai === "pending") {
      byUser.set(mapped.userId, mapped);
      continue;
    }
    if (existing.vaiTro === "owner") continue;
    if (mapped.vaiTro === "owner") {
      byUser.set(mapped.userId, mapped);
      continue;
    }
    const currentRank = CO_SO_ASSIGNABLE_ROLES.indexOf(existing.vaiTro);
    const nextRank = CO_SO_ASSIGNABLE_ROLES.indexOf(mapped.vaiTro);
    if (nextRank >= 0 && (currentRank < 0 || nextRank < currentRank)) {
      byUser.set(mapped.userId, mapped);
    }
  }

  const members = [...byUser.values()].sort((a, b) => {
    if (a.trangThai !== b.trangThai) {
      return a.trangThai === "active" ? -1 : 1;
    }
    if (a.vaiTro === "owner") return -1;
    if (b.vaiTro === "owner") return 1;
    const roleDiff =
      CO_SO_ASSIGNABLE_ROLES.indexOf(a.vaiTro) -
      CO_SO_ASSIGNABLE_ROLES.indexOf(b.vaiTro);
    if (roleDiff !== 0) return roleDiff;
    return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
  });

  return { ok: true, members };
}

export async function addStudioStaffMember(params: {
  orgId: string;
  actorId: string;
  userId: string;
  vaiTro?: string;
}): Promise<
  { ok: true; member: CoSoMemberAdmin } | { ok: false; error: string }
> {
  const org = await loadStudioOrgMeta(params.orgId);
  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy studio." };
  }

  const auth = await assertCanManageMembers(params.actorId, params.orgId);
  if (!auth.ok) return auth;

  const nextRole = normalizeAssignableRole(params.vaiTro) ?? "nhan_vien";
  const admin = createServiceRoleClient();
  const autoActivate = params.userId === params.actorId;

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
    .select("id, vai_tro, trang_thai")
    .eq("id_to_chuc", params.orgId)
    .eq("id_nguoi_dung", params.userId)
    .in("vai_tro", MEMBER_VAI_TRO);

  const rows = existingRows ?? [];
  if (rows.some((row) => row.vai_tro === "owner")) {
    return { ok: false, error: "Không thể thay đổi quyền chủ sở hữu." };
  }

  const staffRow = rows.find((row) => isCoSoStaffRole(row.vai_tro as string));
  const profileBase = {
    userId: profile.id,
    slug: profile.slug,
    tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
    avatarId: profile.avatar_id,
    vaiTro: nextRole,
  };

  async function sendInvite(membershipId: string) {
    const inviter = await loadInviterMeta(params.actorId);
    return notifyCoSoStaffInvite({
      membershipId,
      inviteeId: profile!.id,
      orgId: org!.id,
      orgSlug: org!.slug,
      orgTen: org!.ten,
      loaiToChuc: "studio",
      vaiTro: nextRole,
      inviterId: inviter.id,
      inviterName: inviter.name,
      inviterSlug: inviter.slug,
      inviterAvatarUrl: inviter.avatarUrl,
    });
  }

  if (staffRow) {
    const keepActive = autoActivate || staffRow.trang_thai === "active";
    const nextTrangThai = keepActive ? "active" : "pending";
    const { error } = await admin
      .from("user_thanh_vien_to_chuc")
      .update({ vai_tro: nextRole, trang_thai: nextTrangThai })
      .eq("id", staffRow.id);
    if (error) return { ok: false, error: error.message };

    if (nextTrangThai === "pending") {
      const notified = await sendInvite(staffRow.id);
      if (!notified.ok) return { ok: false, error: notified.error };
    }

    return {
      ok: true,
      member: buildMemberAdmin(
        { id: staffRow.id, ...profileBase, trangThai: nextTrangThai },
        params.actorId,
      ),
    };
  }

  const nextTrangThai = autoActivate ? "active" : "pending";
  const { data: inserted, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .insert({
      id_to_chuc: params.orgId,
      id_nguoi_dung: params.userId,
      vai_tro: nextRole,
      trang_thai: nextTrangThai,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không thêm được thành viên." };
  }

  if (nextTrangThai === "pending") {
    const notified = await sendInvite(inserted.id);
    if (!notified.ok) return { ok: false, error: notified.error };
  }

  return {
    ok: true,
    member: buildMemberAdmin(
      { id: inserted.id, ...profileBase, trangThai: nextTrangThai },
      params.actorId,
    ),
  };
}

export async function addStudioStaffMemberBySlug(params: {
  orgId: string;
  actorId: string;
  slug: string;
  vaiTro?: string;
}): Promise<
  { ok: true; member: CoSoMemberAdmin } | { ok: false; error: string }
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

  return addStudioStaffMember({
    orgId: params.orgId,
    actorId: params.actorId,
    userId: profile.id,
    vaiTro: params.vaiTro,
  });
}

export async function updateStudioStaffMemberRole(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
  vaiTro: string;
}): Promise<
  { ok: true; member: CoSoMemberAdmin } | { ok: false; error: string }
> {
  if (!(await loadStudioOrgMeta(params.orgId))) {
    return { ok: false, error: "Không tìm thấy studio." };
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
      "id, id_nguoi_dung, vai_tro, trang_thai, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id", params.membershipId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle<MemberRow>();

  if (!row || !isCoSoStaffRole(row.vai_tro)) {
    return { ok: false, error: "Không tìm thấy thành viên." };
  }
  if (row.vai_tro === "owner") {
    return { ok: false, error: "Không thể thay đổi quyền chủ sở hữu." };
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: nextRole })
    .eq("id", params.membershipId);

  if (error) return { ok: false, error: error.message };

  const profile = memberProfile(row);
  if (!profile?.slug) {
    return { ok: false, error: "Không tải lại được hồ sơ." };
  }

  return {
    ok: true,
    member: {
      id: row.id,
      userId: row.id_nguoi_dung,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
      avatarId: profile.avatar_id,
      vaiTro: nextRole,
      trangThai: row.trang_thai === "pending" ? "pending" : "active",
      editable: true,
      isSelf: row.id_nguoi_dung === params.actorId,
    },
  };
}

export async function removeStudioStaffMember(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await loadStudioOrgMeta(params.orgId))) {
    return { ok: false, error: "Không tìm thấy studio." };
  }

  const auth = await assertCanManageMembers(params.actorId, params.orgId);
  if (!auth.ok) return auth;

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, vai_tro")
    .eq("id", params.membershipId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle<{ id: string; id_nguoi_dung: string; vai_tro: string }>();

  if (!row || !isCoSoStaffRole(row.vai_tro)) {
    return { ok: false, error: "Không tìm thấy thành viên." };
  }
  if (row.vai_tro === "owner") {
    return { ok: false, error: "Không thể gỡ chủ sở hữu." };
  }
  if (row.id_nguoi_dung === params.actorId) {
    return { ok: false, error: "Không thể tự gỡ quyền của chính mình." };
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .delete()
    .eq("id", params.membershipId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Bàn giao quyền sở hữu studio cho thành viên khác.
 * Chỉ owner hiện tại (hoặc CINs admin). Owner cũ → admin; người nhận → owner.
 */
export async function transferStudioOwnership(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
  confirmSlug: string;
}): Promise<
  { ok: true; members: CoSoMemberAdmin[] } | { ok: false; error: string }
> {
  const org = await loadStudioOrgMeta(params.orgId);
  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy studio." };
  }

  if (
    params.confirmSlug.trim().toLowerCase() !== org.slug.trim().toLowerCase()
  ) {
    return { ok: false, error: "Tên xác nhận không khớp đường dẫn studio." };
  }

  const isCinsAdmin = await getCurrentUserIsCinsAdmin();
  const actorRole = await getViewerCoSoVaiTro(params.actorId, params.orgId);
  if (actorRole !== "owner" && !isCinsAdmin) {
    return { ok: false, error: "Chỉ chủ sở hữu mới bàn giao quyền sở hữu." };
  }

  const admin = createServiceRoleClient();
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

  if (!target || !isCoSoStaffRole(target.vai_tro)) {
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

  const refreshed = await listStudioStaffMembers({
    orgId: params.orgId,
    actorId: params.actorId,
  });
  if (!refreshed.ok) return refreshed;
  return { ok: true, members: refreshed.members };
}
