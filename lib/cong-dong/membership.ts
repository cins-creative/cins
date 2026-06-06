import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PROTECTED_ROLES = new Set(["owner", "admin"]);

export async function isThanhVien(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function isCongDongAdmin(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .in("vai_tro", ["owner", "admin", "quan_ly_noi_dung"])
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function joinCongDong(
  userId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isThanhVien(userId, orgId)) {
    return { ok: true };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin.from("user_thanh_vien_to_chuc").insert({
    id_to_chuc: orgId,
    id_nguoi_dung: userId,
    vai_tro: "thanh_vien",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function leaveCongDong(
  userId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId);

  const roles = (rows ?? []).map((r) => r.vai_tro as string);
  if (roles.length === 0) return { ok: true };
  if (roles.some((role) => PROTECTED_ROLES.has(role))) {
    return { ok: false, error: "Admin/owner không thể rời cộng đồng theo luồng này." };
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .delete()
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("vai_tro", "thanh_vien");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countThanhVien(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId);
  return count ?? 0;
}
