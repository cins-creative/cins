import "server-only";

import {
  canGrantAdmin,
  canManageUsers,
  normalizeEmail,
  resolveSystemRole,
  SUPER_ADMIN_EMAIL,
  systemRoleLabel,
  type DbSystemRole,
  type SystemRole,
} from "@/lib/auth/system-role";
import {
  ADMIN_GIAI_DOAN_FILTERS,
  emptyAdminGiaiDoanStats,
  type AdminGiaiDoanFilter,
  type AdminGiaiDoanStats,
} from "@/lib/admin/nguoi-dung-giai-doan";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type {
  AdminGiaiDoanFilter,
  AdminGiaiDoanStats,
} from "@/lib/admin/nguoi-dung-giai-doan";

export type AdminUserListRow = {
  id: string;
  slug: string;
  tenHienThi: string;
  email: string | null;
  avatarUrl: string | null;
  trangThaiTaiKhoan: string;
  role: SystemRole;
  roleLabel: string;
  isLocked: boolean;
  daXacMinh: boolean;
  taoLuc: string;
  /** `lan_cuoi_active` hoặc fallback Auth `last_sign_in_at`. */
  lanCuoiHoatDong: string | null;
  /** `user_nguoi_dung.giai_doan` — tình trạng học/làm. */
  giaiDoan: GiaiDoan | null;
  giaiDoanLabel: string;
};

export type AdminUserListResponse = {
  rows: AdminUserListRow[];
  total: number;
  actorRole: SystemRole;
  canGrantAdmin: boolean;
  roleStats: Record<SystemRole, number>;
  giaiDoanStats: AdminGiaiDoanStats;
};

export type SetUserRoleInput = {
  actorRole: SystemRole;
  actorProfileId: string | null;
  targetUserId: string;
  newRole: SystemRole;
};

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  email_lien_he: string | null;
  trang_thai_tai_khoan: string;
  da_xac_minh: boolean | null;
  tao_luc: string;
  lan_cuoi_active: string | null;
  giai_doan: GiaiDoan | null;
};

const GIAI_DOAN_SET = new Set<string>(
  ADMIN_GIAI_DOAN_FILTERS.filter((f) => f.id !== "all" && f.id !== "chua_chon").map(
    (f) => f.id,
  ),
);

function parseGiaiDoanFilter(
  raw: string | undefined,
): AdminGiaiDoanFilter | null {
  const v = raw?.trim() ?? "";
  if (!v || v === "all") return null;
  if (v === "chua_chon") return "chua_chon";
  if (GIAI_DOAN_SET.has(v)) return v as GiaiDoan;
  return null;
}

function matchesGiaiDoanFilter(
  row: AdminUserListRow,
  filter: AdminGiaiDoanFilter | null,
): boolean {
  if (!filter) return true;
  if (filter === "chua_chon") return row.giaiDoan == null;
  return row.giaiDoan === filter;
}

function adminGiaiDoanLabel(giaiDoan: GiaiDoan | null): string {
  if (!giaiDoan) return "Chưa chọn";
  return giaiDoanLabel(giaiDoan);
}

type AuthUserMeta = {
  email: string | null;
  lastSignInAt: string | null;
};

type RoleRow = {
  id_nguoi_dung: string;
  vai_tro: DbSystemRole;
};

const LIST_LIMIT = 1000;

async function buildAuthMetaMap(): Promise<Map<string, AuthUserMeta>> {
  const admin = createServiceRoleClient();
  const map = new Map<string, AuthUserMeta>();
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;

    for (const user of data.users) {
      map.set(user.id, {
        email: user.email ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
      });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return map;
}

function matchesQuery(
  row: AdminUserListRow,
  q: string,
): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    row.tenHienThi.toLowerCase().includes(needle) ||
    row.slug.toLowerCase().includes(needle) ||
    (row.email?.toLowerCase().includes(needle) ?? false) ||
    row.roleLabel.toLowerCase().includes(needle)
  );
}

function isRoleLocked(
  targetRole: SystemRole,
  actorRole: SystemRole,
): boolean {
  if (targetRole === "super_admin") return true;
  if (targetRole === "admin" && actorRole !== "super_admin") return true;
  return false;
}

export async function fetchAdminUserList(params: {
  q?: string;
  giaiDoan?: string;
  actorRole: SystemRole;
}): Promise<AdminUserListResponse> {
  const admin = createServiceRoleClient();
  const q = params.q?.trim() ?? "";
  const giaiDoanFilter = parseGiaiDoanFilter(params.giaiDoan);

  const [{ data: profiles, error: profileErr }, authMetaMap, { data: roleRows }] =
    await Promise.all([
      admin
        .from("user_nguoi_dung")
        .select(
          "id, auth_user_id, slug, ten_hien_thi, avatar_id, email_lien_he, trang_thai_tai_khoan, da_xac_minh, tao_luc, lan_cuoi_active, giai_doan",
        )
        .order("tao_luc", { ascending: false })
        .limit(LIST_LIMIT)
        .returns<ProfileRow[]>(),
      buildAuthMetaMap(),
      admin
        .from("user_quyen_he_thong")
        .select("id_nguoi_dung, vai_tro")
        .returns<RoleRow[]>(),
    ]);

  if (profileErr) {
    return {
      rows: [],
      total: 0,
      actorRole: params.actorRole,
      canGrantAdmin: canGrantAdmin(params.actorRole),
      roleStats: {
        super_admin: 0,
        admin: 0,
        curator: 0,
        thanh_vien: 0,
      },
      giaiDoanStats: emptyAdminGiaiDoanStats(),
    };
  }

  const roleByUserId = new Map<string, DbSystemRole>();
  for (const row of roleRows ?? []) {
    roleByUserId.set(row.id_nguoi_dung, row.vai_tro);
  }

  const allRows: AdminUserListRow[] = (profiles ?? []).map((profile) => {
    const authMeta = profile.auth_user_id
      ? authMetaMap.get(profile.auth_user_id) ?? null
      : null;
    const email = authMeta?.email ?? profile.email_lien_he ?? null;
    const dbRole = roleByUserId.get(profile.id) ?? null;
    const role = resolveSystemRole(email, dbRole);
    const lanCuoiHoatDong =
      profile.lan_cuoi_active?.trim() ||
      authMeta?.lastSignInAt?.trim() ||
      null;
    const giaiDoan = profile.giai_doan ?? null;

    return {
      id: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi,
      email,
      avatarUrl: getAvatarUrl(profile.avatar_id),
      trangThaiTaiKhoan: profile.trang_thai_tai_khoan,
      role,
      roleLabel: systemRoleLabel(role),
      isLocked: isRoleLocked(role, params.actorRole),
      daXacMinh: profile.da_xac_minh ?? false,
      taoLuc: profile.tao_luc,
      lanCuoiHoatDong,
      giaiDoan,
      giaiDoanLabel: adminGiaiDoanLabel(giaiDoan),
    };
  });

  const rows = allRows.filter(
    (row) => matchesQuery(row, q) && matchesGiaiDoanFilter(row, giaiDoanFilter),
  );

  const roleStats: Record<SystemRole, number> = {
    super_admin: 0,
    admin: 0,
    curator: 0,
    thanh_vien: 0,
  };
  const giaiDoanStats = emptyAdminGiaiDoanStats();
  for (const row of allRows) {
    roleStats[row.role] += 1;
    giaiDoanStats.all += 1;
    if (row.giaiDoan == null) {
      giaiDoanStats.chua_chon += 1;
    } else {
      giaiDoanStats[row.giaiDoan] += 1;
    }
  }

  return {
    rows,
    total: allRows.length,
    actorRole: params.actorRole,
    canGrantAdmin: canGrantAdmin(params.actorRole),
    roleStats,
    giaiDoanStats,
  };
}

async function getTargetEmail(targetUserId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("auth_user_id, email_lien_he")
    .eq("id", targetUserId)
    .maybeSingle<{ auth_user_id: string | null; email_lien_he: string | null }>();

  if (!profile) return null;

  if (profile.auth_user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(
      profile.auth_user_id,
    );
    if (authUser.user?.email) return authUser.user.email;
  }

  return profile.email_lien_he;
}

async function getTargetDbRole(targetUserId: string): Promise<DbSystemRole | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_quyen_he_thong")
    .select("vai_tro")
    .eq("id_nguoi_dung", targetUserId)
    .maybeSingle<{ vai_tro: DbSystemRole }>();

  return data?.vai_tro ?? null;
}

export async function setUserSystemRole(
  input: SetUserRoleInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { actorRole, actorProfileId, targetUserId, newRole } = input;

  if (!canManageUsers(actorRole)) {
    return { ok: false, message: "Bạn không có quyền quản lý user." };
  }

  if (newRole === "super_admin") {
    return { ok: false, message: "Không thể gán vai trò Admin tối cao." };
  }

  const targetEmail = await getTargetEmail(targetUserId);
  if (!targetEmail && newRole !== "thanh_vien") {
    const admin = createServiceRoleClient();
    const { data: exists } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();
    if (!exists) {
      return { ok: false, message: "Không tìm thấy người dùng." };
    }
  }

  const normalizedTargetEmail = normalizeEmail(targetEmail);
  if (normalizedTargetEmail === SUPER_ADMIN_EMAIL) {
    return {
      ok: false,
      message: "Không thể thay đổi quyền Admin tối cao.",
    };
  }

  const currentDbRole = await getTargetDbRole(targetUserId);
  const currentRole = resolveSystemRole(targetEmail, currentDbRole);

  if (currentRole === "super_admin") {
    return {
      ok: false,
      message: "Không thể thay đổi quyền Admin tối cao.",
    };
  }

  if (currentRole === "admin" && actorRole !== "super_admin") {
    return {
      ok: false,
      message: "Chỉ Admin tối cao mới thay đổi quyền Admin khác.",
    };
  }

  if (newRole === "admin" && !canGrantAdmin(actorRole)) {
    return {
      ok: false,
      message: "Chỉ Admin tối cao mới cấp quyền Admin.",
    };
  }

  const admin = createServiceRoleClient();

  if (newRole === "thanh_vien") {
    const { error } = await admin
      .from("user_quyen_he_thong")
      .delete()
      .eq("id_nguoi_dung", targetUserId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  const dbRole: DbSystemRole = newRole === "admin" ? "admin" : "curator";
  const now = new Date().toISOString();

  const { error } = await admin.from("user_quyen_he_thong").upsert(
    {
      id_nguoi_dung: targetUserId,
      vai_tro: dbRole,
      cap_boi: actorProfileId,
      cap_nhat_luc: now,
    },
    { onConflict: "id_nguoi_dung" },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export type SetUserVerifiedInput = {
  actorRole: SystemRole;
  actorProfileId: string | null;
  targetUserId: string;
  verified: boolean;
};

/** Cấp / thu hồi tick xanh (`user_nguoi_dung.da_xac_minh`). Chỉ admin trở lên. */
export async function setUserVerified(
  input: SetUserVerifiedInput,
): Promise<{ ok: true; daXacMinh: boolean } | { ok: false; message: string }> {
  const { actorRole, actorProfileId, targetUserId, verified } = input;

  if (!canManageUsers(actorRole)) {
    return { ok: false, message: "Bạn không có quyền quản lý user." };
  }

  const admin = createServiceRoleClient();
  const { data: exists } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!exists) {
    return { ok: false, message: "Không tìm thấy người dùng." };
  }

  const { error } = await admin
    .from("user_nguoi_dung")
    .update({
      da_xac_minh: verified,
      xac_minh_luc: verified ? new Date().toISOString() : null,
      xac_minh_boi: verified ? actorProfileId : null,
    })
    .eq("id", targetUserId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, daXacMinh: verified };
}
