import "server-only";

import { getViewerVaiTroInOrg } from "@/lib/cong-dong/membership";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  normalizeStudioHoatDong,
  type StudioHoatDongStatus,
  type StudioLifecycleAction,
} from "@/lib/to-chuc/studio-lifecycle.shared";

export type {
  StudioHoatDongStatus as CongDongHoatDongStatus,
  StudioLifecycleAction as CongDongLifecycleAction,
} from "@/lib/to-chuc/studio-lifecycle.shared";
export { normalizeStudioHoatDong as normalizeCongDongHoatDong } from "@/lib/to-chuc/studio-lifecycle.shared";

const STATUS_BY_ACTION: Record<StudioLifecycleAction, StudioHoatDongStatus> = {
  pause: "tam_ngung",
  resume: "dang_hoat_dong",
  close: "da_dong_cua",
};

function normalizeConfirm(value: string): string {
  return value.trim().toLowerCase();
}

async function loadCongDongLifecycleMeta(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, trang_thai_hoat_dong")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      trang_thai_hoat_dong: string | null;
    }>();
  return data;
}

/**
 * Owner-only: tạm dừng / mở lại / đóng cửa cộng đồng (soft `trang_thai_hoat_dong`).
 * Xác nhận bằng đúng tên tổ chức (`ten`).
 */
export async function updateCongDongLifecycle(params: {
  orgId: string;
  actorId: string;
  action: StudioLifecycleAction;
  confirmTen: string;
}): Promise<
  | { ok: true; trangThaiHoatDong: StudioHoatDongStatus }
  | { ok: false; error: string }
> {
  const org = await loadCongDongLifecycleMeta(params.orgId);
  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }

  if (normalizeConfirm(params.confirmTen) !== normalizeConfirm(org.ten)) {
    return { ok: false, error: "Tên xác nhận không khớp tên cộng đồng." };
  }

  const actorRole = await getViewerVaiTroInOrg(params.actorId, params.orgId);
  if (actorRole !== "owner") {
    return {
      ok: false,
      error: "Chỉ chủ sở hữu mới thay đổi trạng thái cộng đồng.",
    };
  }

  const current = normalizeStudioHoatDong(org.trang_thai_hoat_dong);
  const next = STATUS_BY_ACTION[params.action];

  if (params.action === "pause" && current === "da_dong_cua") {
    return {
      ok: false,
      error:
        "Cộng đồng đã bị xóa — không thể tạm dừng.",
    };
  }
  if (params.action === "resume" && current === "da_dong_cua") {
    return {
      ok: false,
      error: "Cộng đồng đã bị xóa — không thể mở lại.",
    };
  }
  if (params.action === "resume" && current === "dang_hoat_dong") {
    return { ok: true, trangThaiHoatDong: current };
  }
  if (params.action === "pause" && current === "tam_ngung") {
    return { ok: true, trangThaiHoatDong: current };
  }
  if (params.action === "close" && current === "da_dong_cua") {
    return { ok: true, trangThaiHoatDong: current };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("org_to_chuc")
    .update({ trang_thai_hoat_dong: next })
    .eq("id", org.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, trangThaiHoatDong: next };
}
