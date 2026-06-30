"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canAccessAdminPanel,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";
import {
  listBaoCaoForTarget,
  resolveBaoCaoGroup,
  type BaoCaoDetailItem,
} from "@/lib/social/bao-cao";
import type { TrangThaiBaoCao } from "@/lib/social/bao-cao-constants";

type ResolveInput = {
  loaiDoiTuong: string;
  idDoiTuong: string;
  trangThai: Extract<TrangThaiBaoCao, "da_xu_ly" | "bo_qua" | "dang_xu_ly">;
  ketQua: string;
};

export async function adminResolveBaoCao(
  input: ResolveInput,
): Promise<
  | { ok: true; soNguoiBaoCao: number }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const role = await getCurrentUserSystemRole();
  if (!canAccessAdminPanel(role)) {
    return { ok: false, message: "Không có quyền xử lý báo cáo." };
  }
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, message: "Cần đăng nhập." };
  }

  const result = await resolveBaoCaoGroup({
    adminId: session.profile.id,
    loaiDoiTuong: input.loaiDoiTuong,
    idDoiTuong: input.idDoiTuong,
    trangThai: input.trangThai,
    ketQua: input.ketQua,
  });

  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin/bao-cao");
  return { ok: true, soNguoiBaoCao: result.soNguoiBaoCao };
}

export async function adminLoadBaoCaoDetail(
  loaiDoiTuong: string,
  idDoiTuong: string,
): Promise<
  | { ok: true; items: BaoCaoDetailItem[] }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const role = await getCurrentUserSystemRole();
  if (!canAccessAdminPanel(role)) {
    return { ok: false, message: "Không có quyền." };
  }
  const items = await listBaoCaoForTarget(loaiDoiTuong, idDoiTuong);
  return { ok: true, items };
}
