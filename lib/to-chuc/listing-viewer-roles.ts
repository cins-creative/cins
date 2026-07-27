import "server-only";

import {
  pickCoSoStaffVaiTro,
  type CoSoStaffVaiTro,
} from "@/lib/to-chuc/co-so-vai-tro";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

/** Batch vai trò staff của viewer trên nhiều org (listing «của tôi»). */
export async function loadViewerOrgStaffRolesByOrgIds(
  viewerId: string | null | undefined,
  orgIds: string[],
): Promise<Map<string, CoSoStaffVaiTro>> {
  const out = new Map<string, CoSoStaffVaiTro>();
  const id = viewerId?.trim();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (!id || !unique.length || !hasServiceRoleEnv()) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc, vai_tro")
    .eq("id_nguoi_dung", id)
    .eq("trang_thai", "active")
    .in("id_to_chuc", unique);

  const rolesByOrg = new Map<string, string[]>();
  for (const row of data ?? []) {
    const orgId = row.id_to_chuc as string;
    const list = rolesByOrg.get(orgId) ?? [];
    list.push(row.vai_tro as string);
    rolesByOrg.set(orgId, list);
  }

  for (const [orgId, roles] of rolesByOrg) {
    const picked = pickCoSoStaffVaiTro(roles);
    if (picked) out.set(orgId, picked);
  }

  return out;
}

/** Số bài đăng đã đăng (`org_bai_dang.trang_thai = da_dang`) theo org — để sort ưu tiên org nhiều dữ liệu. */
export async function loadOrgBaiDangCountByOrgIds(
  orgIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (!unique.length || !hasServiceRoleEnv()) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_bai_dang")
    .select("id_to_chuc")
    .eq("trang_thai", "da_dang")
    .in("id_to_chuc", unique);

  for (const row of data ?? []) {
    const orgId = row.id_to_chuc as string;
    if (!orgId) continue;
    out.set(orgId, (out.get(orgId) ?? 0) + 1);
  }
  return out;
}

/** Org trong danh sách mà viewer đang theo dõi (`user_theo_doi.loai_doi_tuong = to_chuc`). */
export async function loadViewerFollowingOrgIdSet(
  viewerId: string | null | undefined,
  orgIds: string[],
): Promise<Set<string>> {
  const out = new Set<string>();
  const id = viewerId?.trim();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (!id || !unique.length || !hasServiceRoleEnv()) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", id)
    .eq("loai_doi_tuong", "to_chuc")
    .in("id_doi_tuong", unique);

  for (const row of data ?? []) {
    const orgId = row.id_doi_tuong as string;
    if (orgId) out.add(orgId);
  }
  return out;
}
