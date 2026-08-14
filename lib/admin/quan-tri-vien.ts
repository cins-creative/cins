import "server-only";

import { listAdminNavTabs } from "@/lib/admin/admin-nav";
import {
  canEditStaffTabs,
  fetchTabAnByUserIds,
} from "@/lib/admin/admin-tab-visibility";
import type {
  AdminStaffListResponse,
  AdminStaffRole,
  AdminStaffRow,
} from "@/lib/admin/quan-tri-vien-types";
import {
  normalizeEmail,
  resolveSystemRole,
  SUPER_ADMIN_EMAIL,
  systemRoleLabel,
  type DbSystemRole,
  type SystemRole,
} from "@/lib/auth/system-role";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  email_lien_he: string | null;
  trang_thai_tai_khoan: string;
};

type RoleRow = {
  id_nguoi_dung: string;
  vai_tro: DbSystemRole;
};

const PROFILE_COLS =
  "id, auth_user_id, slug, ten_hien_thi, avatar_id, email_lien_he, trang_thai_tai_khoan";

function isStaffRole(role: SystemRole): role is AdminStaffRole {
  return role === "super_admin" || role === "admin" || role === "curator";
}

function matchesQuery(row: AdminStaffRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    row.tenHienThi.toLowerCase().includes(needle) ||
    row.slug.toLowerCase().includes(needle) ||
    (row.email?.toLowerCase().includes(needle) ?? false) ||
    row.roleLabel.toLowerCase().includes(needle)
  );
}

async function findSuperAdminProfiles(): Promise<ProfileRow[]> {
  const admin = createServiceRoleClient();
  const found = new Map<string, ProfileRow>();

  const { data: byContact } = await admin
    .from("user_nguoi_dung")
    .select(PROFILE_COLS)
    .ilike("email_lien_he", SUPER_ADMIN_EMAIL)
    .neq("trang_thai_tai_khoan", "da_xoa")
    .limit(5)
    .returns<ProfileRow[]>();

  for (const row of byContact ?? []) found.set(row.id, row);
  if (found.size > 0) return [...found.values()];

  let page = 1;
  let authId: string | null = null;
  while (page <= 5 && !authId) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data.users.length) break;
    for (const user of data.users) {
      if (normalizeEmail(user.email) === SUPER_ADMIN_EMAIL) {
        authId = user.id;
        break;
      }
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (authId) {
    const { data: byAuth } = await admin
      .from("user_nguoi_dung")
      .select(PROFILE_COLS)
      .eq("auth_user_id", authId)
      .neq("trang_thai_tai_khoan", "da_xoa")
      .maybeSingle<ProfileRow>();
    if (byAuth) found.set(byAuth.id, byAuth);
  }

  return [...found.values()];
}

async function emailsForAuthIds(
  authIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (authIds.length === 0) return map;
  const admin = createServiceRoleClient();
  await Promise.all(
    authIds.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data.user) return;
      map.set(id, data.user.email ?? null);
    }),
  );
  return map;
}

export async function fetchAdminStaffList(params: {
  q?: string;
  role?: string;
  actorRole: SystemRole;
}): Promise<AdminStaffListResponse> {
  const admin = createServiceRoleClient();
  const q = params.q?.trim() ?? "";
  const roleFilter = params.role?.trim() ?? "";

  const [{ data: roleRows, error: roleErr }, superProfiles] = await Promise.all([
    admin
      .from("user_quyen_he_thong")
      .select("id_nguoi_dung, vai_tro")
      .returns<RoleRow[]>(),
    findSuperAdminProfiles(),
  ]);

  if (roleErr) {
    return {
      rows: [],
      total: 0,
      actorRole: params.actorRole,
      tabs: listAdminNavTabs(),
    };
  }

  const roleByUser = new Map(
    (roleRows ?? []).map((row) => [row.id_nguoi_dung, row.vai_tro]),
  );
  const ids = new Set<string>([
    ...roleByUser.keys(),
    ...superProfiles.map((p) => p.id),
  ]);

  if (ids.size === 0) {
    return {
      rows: [],
      total: 0,
      actorRole: params.actorRole,
      tabs: listAdminNavTabs(),
    };
  }

  const { data: profiles, error: profileErr } = await admin
    .from("user_nguoi_dung")
    .select(PROFILE_COLS)
    .in("id", [...ids])
    .neq("trang_thai_tai_khoan", "da_xoa")
    .returns<ProfileRow[]>();

  if (profileErr) {
    return {
      rows: [],
      total: 0,
      actorRole: params.actorRole,
      tabs: listAdminNavTabs(),
    };
  }

  const profileList = profiles ?? [];
  const authIds = profileList
    .map((p) => p.auth_user_id)
    .filter((id): id is string => Boolean(id));
  const [emailByAuth, tabAnByUser] = await Promise.all([
    emailsForAuthIds(authIds),
    fetchTabAnByUserIds(profileList.map((p) => p.id)),
  ]);

  const rows: AdminStaffRow[] = [];
  for (const profile of profileList) {
    const email =
      (profile.auth_user_id
        ? emailByAuth.get(profile.auth_user_id)
        : null) ??
      profile.email_lien_he ??
      null;
    const role = resolveSystemRole(email, roleByUser.get(profile.id) ?? null);
    if (!isStaffRole(role)) continue;

    rows.push({
      id: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
      email,
      avatarUrl: getAvatarUrl(profile.avatar_id),
      role,
      roleLabel: systemRoleLabel(role),
      tabAn: role === "super_admin" ? [] : (tabAnByUser.get(profile.id) ?? []),
      canEditTabs: canEditStaffTabs(params.actorRole, role),
    });
  }

  const roleOrder: Record<AdminStaffRole, number> = {
    super_admin: 0,
    admin: 1,
    curator: 2,
  };
  rows.sort((a, b) => {
    const d = roleOrder[a.role] - roleOrder[b.role];
    if (d !== 0) return d;
    return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
  });

  const filtered = rows.filter((row) => {
    if (roleFilter && row.role !== roleFilter) return false;
    return matchesQuery(row, q);
  });

  return {
    rows: filtered,
    total: filtered.length,
    actorRole: params.actorRole,
    tabs: listAdminNavTabs(),
  };
}

export async function fetchStaffRoleByUserId(
  userId: string,
): Promise<{ role: SystemRole; email: string | null } | null> {
  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .neq("trang_thai_tai_khoan", "da_xoa")
    .maybeSingle<ProfileRow>();
  if (!profile) return null;

  const { data: roleRow } = await admin
    .from("user_quyen_he_thong")
    .select("vai_tro")
    .eq("id_nguoi_dung", userId)
    .maybeSingle<{ vai_tro: DbSystemRole }>();

  let email = profile.email_lien_he;
  if (profile.auth_user_id) {
    const { data } = await admin.auth.admin.getUserById(profile.auth_user_id);
    email = data.user?.email ?? email;
  }

  return {
    role: resolveSystemRole(email, roleRow?.vai_tro ?? null),
    email,
  };
}
