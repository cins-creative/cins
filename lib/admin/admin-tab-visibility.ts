import "server-only";

import {
  ADMIN_TABS_REQUIRE_MANAGE_USERS,
  adminHrefFromTabKey,
  adminTabKeyFromHref,
  matchAdminNavHref,
  sanitizeAdminTabKeys,
} from "@/lib/admin/admin-nav";
import {
  canManageUsers,
  type SystemRole,
} from "@/lib/auth/system-role";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type TabAnRow = {
  id_nguoi_dung: string;
  tab_an: string[] | null;
};

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("user_admin_tab_an") && msg.includes("does not exist")
  );
}

export async function fetchTabAnByUserIds(
  userIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("user_admin_tab_an")
      .select("id_nguoi_dung, tab_an")
      .in("id_nguoi_dung", userIds)
      .returns<TabAnRow[]>();

    if (error) {
      if (!isMissingTableError(error)) {
        console.error("[admin-tab-visibility] fetch", error.message);
      }
      return map;
    }

    for (const row of data ?? []) {
      map.set(row.id_nguoi_dung, sanitizeAdminTabKeys(row.tab_an ?? []));
    }
  } catch (e) {
    console.error("[admin-tab-visibility] fetch", e);
  }

  return map;
}

export function tabKeysToHiddenHrefs(tabAn: string[]): string[] {
  return tabAn.map(adminHrefFromTabKey);
}

export function resolveHiddenAdminTabHrefs(params: {
  role: SystemRole;
  tabAn: string[];
}): string[] {
  const hidden = new Set<string>();
  if (!canManageUsers(params.role)) {
    for (const href of ADMIN_TABS_REQUIRE_MANAGE_USERS) hidden.add(href);
  }
  if (params.role === "super_admin") return [...hidden];
  for (const href of tabKeysToHiddenHrefs(params.tabAn)) hidden.add(href);
  return [...hidden];
}

export async function getHiddenAdminTabHrefsForUser(params: {
  role: SystemRole;
  profileId: string | null;
}): Promise<string[]> {
  if (params.role === "super_admin" || !params.profileId) {
    return resolveHiddenAdminTabHrefs({ role: params.role, tabAn: [] });
  }
  const map = await fetchTabAnByUserIds([params.profileId]);
  return resolveHiddenAdminTabHrefs({
    role: params.role,
    tabAn: map.get(params.profileId) ?? [],
  });
}

export function isAdminPathHidden(
  pathname: string,
  hiddenHrefs: readonly string[],
): boolean {
  const matched = matchAdminNavHref(pathname);
  if (!matched) return false;
  return hiddenHrefs.includes(matched);
}

export async function upsertUserAdminTabAn(params: {
  targetUserId: string;
  tabAn: string[];
  actorProfileId: string | null;
}): Promise<{ ok: true } | { ok: false; missingTable: boolean; message: string }> {
  const keys = sanitizeAdminTabKeys(params.tabAn);
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from("user_admin_tab_an").upsert(
      {
        id_nguoi_dung: params.targetUserId,
        tab_an: keys,
        cap_boi: params.actorProfileId,
        cap_nhat_luc: new Date().toISOString(),
      },
      { onConflict: "id_nguoi_dung" },
    );

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          missingTable: true,
          message:
            "Chưa có bảng user_admin_tab_an. Chạy supabase/sql/migration_user_admin_tab_an.sql trên Supabase SQL Editor.",
        };
      }
      return { ok: false, missingTable: false, message: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      missingTable: false,
      message: e instanceof Error ? e.message : "Không lưu được phân quyền tab.",
    };
  }
}

export function canEditStaffTabs(
  actorRole: SystemRole,
  targetRole: SystemRole,
): boolean {
  if (targetRole === "super_admin") return false;
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin" && targetRole === "curator") return true;
  return false;
}

/** Không cho tự ẩn tab Quản trị viên — mất đường sửa lại. */
export function lockSelfManageTab(
  actorProfileId: string | null,
  targetUserId: string,
  tabAn: string[],
): string[] {
  if (!actorProfileId || actorProfileId !== targetUserId) return tabAn;
  const manageKey = adminTabKeyFromHref("/admin/quan-tri-vien");
  return tabAn.filter((key) => key !== manageKey);
}
