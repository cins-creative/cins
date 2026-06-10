import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { CoSoStaffVaiTro } from "./co-so-vai-tro";
import {
  canManageCoSoMembers,
  CO_SO_ASSIGNABLE_ROLES,
  isCoSoStaffRole,
} from "./co-so-vai-tro";
import type { CoSoMemberAdmin } from "./co-so-settings-types";
import { getViewerCoSoVaiTro, isCoSoOrgAdmin } from "./co-so-membership";

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

function mapMember(row: MemberRow, actorId: string): CoSoMemberAdmin | null {
  if (!isCoSoStaffRole(row.vai_tro)) return null;
  const profile = memberProfile(row);
  if (!profile?.slug) return null;
  const isSelf = row.id_nguoi_dung === actorId;
  return {
    id: row.id,
    userId: row.id_nguoi_dung,
    slug: profile.slug,
    tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
    avatarId: profile.avatar_id,
    vaiTro: row.vai_tro,
    editable: row.vai_tro !== "owner",
    isSelf,
  };
}

async function assertCanManageMembers(
  actorId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isCoSoOrgAdmin(orgId, actorId))) {
    return { ok: false, error: "Bạn không có quyền quản trị cơ sở này." };
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!(await getCurrentUserIsCinsAdmin()) && !canManageCoSoMembers(vaiTro)) {
    return {
      ok: false,
      error: "Chỉ quản trị viên mới quản lý quyền trên cơ sở.",
    };
  }
  return { ok: true };
}

async function loadCoSoOrgId(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle<{ id: string }>();
  return Boolean(data?.id);
}

export async function listCoSoStaffMembers(params: {
  orgId: string;
  actorId: string;
}): Promise<
  { ok: true; members: CoSoMemberAdmin[] } | { ok: false; error: string }
> {
  if (!(await loadCoSoOrgId(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở." };
  }
  if (!(await isCoSoOrgAdmin(params.orgId, params.actorId))) {
    return { ok: false, error: "Bạn không có quyền quản trị cơ sở này." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id_to_chuc", params.orgId)
    .in("vai_tro", [
      "owner",
      "admin",
      "quan_ly_noi_dung",
      "quan_ly_tuyen_sinh",
      "giao_vien",
      "nhan_vien",
    ])
    .eq("trang_thai", "active");

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
    const currentRank = CO_SO_ASSIGNABLE_ROLES.indexOf(
      existing.vaiTro as (typeof CO_SO_ASSIGNABLE_ROLES)[number],
    );
    const nextRank = CO_SO_ASSIGNABLE_ROLES.indexOf(
      mapped.vaiTro as (typeof CO_SO_ASSIGNABLE_ROLES)[number],
    );
    if (existing.vaiTro === "owner") continue;
    if (mapped.vaiTro === "owner") {
      byUser.set(mapped.userId, mapped);
      continue;
    }
    if (nextRank >= 0 && (currentRank < 0 || nextRank < currentRank)) {
      byUser.set(mapped.userId, mapped);
    }
  }

  const members = [...byUser.values()].sort((a, b) => {
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

function normalizeAssignableRole(value: string | undefined): CoSoStaffVaiTro | null {
  const role = value?.trim();
  if (!role || !CO_SO_ASSIGNABLE_ROLES.includes(role as CoSoStaffVaiTro)) {
    return null;
  }
  return role as CoSoStaffVaiTro;
}

export async function addCoSoStaffMember(params: {
  orgId: string;
  actorId: string;
  userId: string;
  vaiTro?: string;
}): Promise<
  { ok: true; member: CoSoMemberAdmin } | { ok: false; error: string }
> {
  if (!(await loadCoSoOrgId(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở." };
  }

  const auth = await assertCanManageMembers(params.actorId, params.orgId);
  if (!auth.ok) return auth;

  const nextRole = normalizeAssignableRole(params.vaiTro) ?? "nhan_vien";
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
    .in("vai_tro", [
      "owner",
      "admin",
      "quan_ly_noi_dung",
      "quan_ly_tuyen_sinh",
      "giao_vien",
      "nhan_vien",
    ]);

  const rows = existingRows ?? [];
  if (rows.some((row) => row.vai_tro === "owner")) {
    return { ok: false, error: "Không thể thay đổi quyền chủ sở hữu hệ thống." };
  }

  const staffRow = rows.find((row) => isCoSoStaffRole(row.vai_tro as string));

  if (staffRow) {
    const { error } = await admin
      .from("user_thanh_vien_to_chuc")
      .update({ vai_tro: nextRole })
      .eq("id", staffRow.id);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      member: {
        id: staffRow.id,
        userId: profile.id,
        slug: profile.slug,
        tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
        avatarId: profile.avatar_id,
        vaiTro: nextRole,
        editable: true,
        isSelf: profile.id === params.actorId,
      },
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
    member: {
      id: inserted.id,
      userId: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
      avatarId: profile.avatar_id,
      vaiTro: nextRole,
      editable: true,
      isSelf: profile.id === params.actorId,
    },
  };
}

export async function addCoSoStaffMemberBySlug(params: {
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

  return addCoSoStaffMember({
    orgId: params.orgId,
    actorId: params.actorId,
    userId: profile.id,
    vaiTro: params.vaiTro,
  });
}

export async function updateCoSoStaffMemberRole(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
  vaiTro: string;
}): Promise<
  { ok: true; member: CoSoMemberAdmin } | { ok: false; error: string }
> {
  if (!(await loadCoSoOrgId(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở." };
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

  if (!row || !isCoSoStaffRole(row.vai_tro)) {
    return { ok: false, error: "Không tìm thấy thành viên." };
  }
  if (row.vai_tro === "owner") {
    return { ok: false, error: "Không thể thay đổi quyền chủ sở hữu hệ thống." };
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
      editable: true,
      isSelf: row.id_nguoi_dung === params.actorId,
    },
  };
}

export async function removeCoSoStaffMember(params: {
  orgId: string;
  actorId: string;
  membershipId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await loadCoSoOrgId(params.orgId))) {
    return { ok: false, error: "Không tìm thấy cơ sở." };
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
    return { ok: false, error: "Không thể gỡ chủ sở hữu hệ thống." };
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
