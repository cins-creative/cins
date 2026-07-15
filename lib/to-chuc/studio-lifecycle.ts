import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import {
  normalizeStudioHoatDong,
  type StudioHoatDongStatus,
  type StudioLifecycleAction,
} from "@/lib/to-chuc/studio-lifecycle.shared";

export type {
  StudioHoatDongStatus,
  StudioLifecycleAction,
} from "@/lib/to-chuc/studio-lifecycle.shared";
export { normalizeStudioHoatDong } from "@/lib/to-chuc/studio-lifecycle.shared";

const STUDIO_ORG_TYPES = ["studio", "doanh_nghiep"] as const;

const STATUS_BY_ACTION: Record<StudioLifecycleAction, StudioHoatDongStatus> = {
  pause: "tam_ngung",
  resume: "dang_hoat_dong",
  close: "da_dong_cua",
};

function normalizeConfirm(value: string): string {
  return value.trim().toLowerCase();
}

async function loadStudioLifecycleMeta(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, trang_thai_hoat_dong")
    .eq("id", orgId)
    .in("loai_to_chuc", [...STUDIO_ORG_TYPES])
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      trang_thai_hoat_dong: string | null;
    }>();
  return data;
}

export async function getStudioHoatDongStatus(
  orgId: string,
): Promise<StudioHoatDongStatus | null> {
  const org = await loadStudioLifecycleMeta(orgId);
  if (!org) return null;
  return normalizeStudioHoatDong(org.trang_thai_hoat_dong);
}

/**
 * Owner-only: tạm dừng / mở lại / đóng cửa studio (soft status).
 * Xác nhận bằng đúng tên tổ chức (`ten`).
 */
export async function updateStudioLifecycle(params: {
  orgId: string;
  actorId: string;
  action: StudioLifecycleAction;
  confirmTen: string;
}): Promise<
  | { ok: true; trangThaiHoatDong: StudioHoatDongStatus }
  | { ok: false; error: string }
> {
  const org = await loadStudioLifecycleMeta(params.orgId);
  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy studio." };
  }

  if (normalizeConfirm(params.confirmTen) !== normalizeConfirm(org.ten)) {
    return { ok: false, error: "Tên xác nhận không khớp tên tổ chức." };
  }

  const actorRole = await getViewerCoSoVaiTro(params.actorId, params.orgId);
  if (actorRole !== "owner") {
    return { ok: false, error: "Chỉ chủ sở hữu mới thay đổi trạng thái studio." };
  }

  const current = normalizeStudioHoatDong(org.trang_thai_hoat_dong);
  const next = STATUS_BY_ACTION[params.action];

  if (params.action === "pause" && current === "da_dong_cua") {
    return {
      ok: false,
      error:
        "Studio đã đóng cửa — không thể tạm dừng. Liên hệ admin CINs nếu cần mở lại.",
    };
  }
  if (params.action === "resume" && current === "da_dong_cua") {
    return {
      ok: false,
      error: "Studio đã đóng cửa — chỉ admin CINs có thể mở lại.",
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
