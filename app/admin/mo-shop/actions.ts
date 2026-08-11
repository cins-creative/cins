"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canAccessAdminPanel,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { updateShopDangKyMoAdmin } from "@/lib/shop/dang-ky-mo-admin";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export async function adminUpdateShopDangKyMo(input: {
  id: string;
  trangThai: string;
  ghiChuNoiBo?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const role = await getCurrentUserSystemRole();
  if (!canAccessAdminPanel(role)) {
    return { ok: false, message: "Không có quyền quản lý lead mở shop." };
  }
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, message: "Cần đăng nhập." };
  }

  const result = await updateShopDangKyMoAdmin({
    id: input.id,
    trangThai: input.trangThai,
    ghiChuNoiBo: input.ghiChuNoiBo,
  });
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin/mo-shop");
  revalidatePath(`/admin/mo-shop/${input.id}`);
  return { ok: true };
}
