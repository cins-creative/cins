import "server-only";

import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function updateCongDongBranding(params: {
  orgId: string;
  adminId: string;
  avatarId?: string | null;
  coverId?: string | null;
}): Promise<
  | { ok: true; avatarId: string | null; coverId: string | null }
  | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin mới đổi avatar và cover nhóm." };
  }

  const update: { avatar_id?: string | null; cover_id?: string | null } = {};
  if (params.avatarId !== undefined) {
    const trimmed = params.avatarId?.trim();
    update.avatar_id = trimmed || null;
  }
  if (params.coverId !== undefined) {
    const trimmed = params.coverId?.trim();
    update.cover_id = trimmed || null;
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
    .select("avatar_id, cover_id")
    .maybeSingle<{ avatar_id: string | null; cover_id: string | null }>();

  if (error || !data) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  return {
    ok: true,
    avatarId: data.avatar_id,
    coverId: data.cover_id,
  };
}
