"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canAccessAdminPanel,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { updateGopYStatus, type GopYTrangThai } from "@/lib/gop-y/gop-y";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export async function adminUpdateGopYStatus(input: {
  id: string;
  trangThai: GopYTrangThai;
  ghiChu?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const role = await getCurrentUserSystemRole();
  if (!canAccessAdminPanel(role)) {
    return { ok: false, message: "Không có quyền xử lý góp ý." };
  }
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, message: "Cần đăng nhập." };
  }

  const result = await updateGopYStatus({
    id: input.id,
    adminId: session.profile.id,
    trangThai: input.trangThai,
    ghiChu: input.ghiChu,
  });
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin/gop-y");
  return { ok: true };
}
