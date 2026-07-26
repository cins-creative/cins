import "server-only";

import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_TEN = 120;
const MAX_MOTA = 500;

export type CongDongProfileUpdate = {
  orgId: string;
  adminId: string;
  avatarId?: string | null;
  coverId?: string | null;
  ten?: string;
  moTa?: string | null;
};

export type CongDongProfileResult = {
  avatarId: string | null;
  coverId: string | null;
  ten: string;
  moTa: string | null;
};

/** Admin cộng đồng cập nhật profile: tên, mô tả, avatar, cover. */
export async function updateCongDongProfile(
  params: CongDongProfileUpdate,
): Promise<
  { ok: true; data: CongDongProfileResult } | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return {
      ok: false,
      error: "Chỉ admin cộng đồng mới sửa thông tin nhóm.",
    };
  }

  const update: {
    avatar_id?: string | null;
    cover_id?: string | null;
    ten?: string;
    mo_ta?: string | null;
  } = {};

  if (params.avatarId !== undefined) {
    const trimmed = params.avatarId?.trim();
    update.avatar_id = trimmed || null;
  }
  if (params.coverId !== undefined) {
    const trimmed = params.coverId?.trim();
    update.cover_id = trimmed || null;
  }
  if (params.ten !== undefined) {
    const ten = params.ten.trim();
    if (ten.length < 2) {
      return { ok: false, error: "Tên cộng đồng phải có ít nhất 2 ký tự." };
    }
    if (ten.length > MAX_TEN) {
      return { ok: false, error: `Tên cộng đồng tối đa ${MAX_TEN} ký tự.` };
    }
    update.ten = ten;
  }
  if (params.moTa !== undefined) {
    const moTa = params.moTa?.trim() || "";
    if (moTa.length > MAX_MOTA) {
      return { ok: false, error: `Mô tả tối đa ${MAX_MOTA} ký tự.` };
    }
    update.mo_ta = moTa || null;
  }

  if (!Object.keys(update).length) {
    return { ok: false, error: "Không có trường cần cập nhật." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_to_chuc")
    .update(update)
    .eq("id", params.orgId)
    .eq("loai_to_chuc", "cong_dong")
    .select("avatar_id, cover_id, ten, mo_ta")
    .maybeSingle<{
      avatar_id: string | null;
      cover_id: string | null;
      ten: string;
      mo_ta: string | null;
    }>();

  if (error || !data) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  return {
    ok: true,
    data: {
      avatarId: data.avatar_id,
      coverId: data.cover_id,
      ten: data.ten,
      moTa: data.mo_ta,
    },
  };
}

/** @deprecated Prefer updateCongDongProfile — giữ alias branding. */
export async function updateCongDongBranding(params: {
  orgId: string;
  adminId: string;
  avatarId?: string | null;
  coverId?: string | null;
}): Promise<
  | { ok: true; avatarId: string | null; coverId: string | null }
  | { ok: false; error: string }
> {
  const result = await updateCongDongProfile(params);
  if (!result.ok) return result;
  return {
    ok: true,
    avatarId: result.data.avatarId,
    coverId: result.data.coverId,
  };
}
