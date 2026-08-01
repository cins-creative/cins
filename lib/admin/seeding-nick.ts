/**
 * Nick seeding (`auto_tai_khoan`) — admin (`canManageUsers`) được
 * quản lý hồ sơ / bài / shop như chủ tài khoản clone.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManageUsers,
  getCurrentUserSystemRole,
  type SystemRole,
} from "@/lib/auth/system-role";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

function db(): SupabaseClient {
  if (!hasServiceRoleEnv()) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY");
  }
  return createServiceRoleClient();
}

/** Profile có trong roster seeding (ai | clone). */
export async function laNickSeeding(
  idNguoiDung: string,
  client?: SupabaseClient,
): Promise<boolean> {
  if (!idNguoiDung) return false;
  const admin = client || db();
  const { data, error } = await admin
    .from("auto_tai_khoan")
    .select("id")
    .eq("id_nguoi_dung", idNguoiDung)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export function adminDuocSuaBaiSeeding(
  role: SystemRole | null | undefined,
): boolean {
  return Boolean(role && canManageUsers(role));
}

/** Admin + profile thuộc roster seeding → được sửa như chủ. */
export async function adminCoTheSuaBaiNickSeeding(params: {
  role: SystemRole | null | undefined;
  idNguoiDung: string;
  client?: SupabaseClient;
}): Promise<boolean> {
  if (!adminDuocSuaBaiSeeding(params.role)) return false;
  return laNickSeeding(params.idNguoiDung, params.client);
}

export type ActingOwnerProfile = {
  ownerId: string;
  ownerSlug: string;
};

/**
 * Chủ thật, hoặc admin trên nick seeding.
 * `targetOwnerId` / `targetOwnerSlug` = hồ sơ đang thao tác (clone).
 */
export async function resolveActingOwner(params: {
  sessionProfileId: string;
  sessionSlug: string;
  targetOwnerId?: string | null;
  targetOwnerSlug?: string | null;
  role?: SystemRole | null;
  client?: SupabaseClient;
}): Promise<ActingOwnerProfile | null> {
  const admin = params.client || db();
  let targetId = params.targetOwnerId?.trim() || null;
  let targetSlug = params.targetOwnerSlug?.trim() || null;

  if (!targetId && !targetSlug) {
    return {
      ownerId: params.sessionProfileId,
      ownerSlug: params.sessionSlug,
    };
  }

  if (!targetId || !targetSlug) {
    const q = admin.from("user_nguoi_dung").select("id, slug");
    const { data: row } = targetId
      ? await q.eq("id", targetId).maybeSingle<{ id: string; slug: string }>()
      : await q
          .eq("slug", targetSlug!)
          .maybeSingle<{ id: string; slug: string }>();
    if (!row?.id || !row.slug) return null;
    targetId = row.id;
    targetSlug = row.slug;
  }

  if (targetId === params.sessionProfileId) {
    return { ownerId: targetId, ownerSlug: targetSlug! };
  }

  const role = params.role ?? (await getCurrentUserSystemRole());
  const ok = await adminCoTheSuaBaiNickSeeding({
    role,
    idNguoiDung: targetId,
    client: admin,
  });
  if (!ok) return null;
  return { ownerId: targetId, ownerSlug: targetSlug! };
}

/** Session có được coi là chủ của `targetOwnerId` không (kể cả admin seeding). */
export async function sessionMayActAsOwner(params: {
  sessionProfileId: string | null | undefined;
  targetOwnerId: string;
  client?: SupabaseClient;
}): Promise<boolean> {
  if (!params.sessionProfileId || !params.targetOwnerId) return false;
  if (params.sessionProfileId === params.targetOwnerId) return true;
  const role = await getCurrentUserSystemRole();
  return adminCoTheSuaBaiNickSeeding({
    role,
    idNguoiDung: params.targetOwnerId,
    client: params.client,
  });
}
