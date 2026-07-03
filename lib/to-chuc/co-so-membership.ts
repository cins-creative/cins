import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  canChangeCoSoSlug,
  canManageCoSoMembers,
  coSoVaiTroLabel,
  pickCoSoStaffVaiTro,
  type CoSoStaffVaiTro,
} from "./co-so-vai-tro";

const CO_SO_ADMIN_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
] as const;

export async function getViewerCoSoVaiTro(
  profileId: string,
  orgId: string,
): Promise<CoSoStaffVaiTro | null> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", profileId)
    .eq("trang_thai", "active");

  if (!rows?.length) return null;
  return pickCoSoStaffVaiTro(rows.map((row) => row.vai_tro as string));
}

export async function isCoSoOrgAdmin(
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
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle();

  if (!org?.id) return false;

  const { data: member } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", profileId)
    .eq("trang_thai", "active")
    .in("vai_tro", [...CO_SO_ADMIN_ROLES])
    .limit(1)
    .maybeSingle();

  return Boolean(member);
}
