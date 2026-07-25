import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { CoSoStaffVaiTro } from "@/lib/to-chuc/co-so-vai-tro";
import {
  CO_SO_MODULE_KEYS,
  isCoSoFounderTier,
  isCoSoModuleKey,
  type CoSoModuleKey,
  type CoSoMucQuyen,
} from "@/lib/to-chuc/co-so-quan-ly-modules";

export {
  CO_SO_MODULE_KEYS,
  CO_SO_MODULE_LABELS,
  isCoSoFounderTier,
  isCoSoModuleKey,
  type CoSoModuleKey,
  type CoSoMucQuyen,
} from "@/lib/to-chuc/co-so-quan-ly-modules";

function fullQuyenMap(muc: CoSoMucQuyen): Record<CoSoModuleKey, CoSoMucQuyen> {
  return Object.fromEntries(
    CO_SO_MODULE_KEYS.map((k) => [k, muc]),
  ) as Record<CoSoModuleKey, CoSoMucQuyen>;
}

/**
 * Quyền theo module cho 1 actor trên 1 cơ sở.
 * Founder tier → mọi module `sua` (không query DB). Còn lại → tra
 * `org_thanh_vien_quyen`, vắng row = `an`.
 */
export async function getCoSoQuyenMap(
  orgId: string,
  actorId: string | null | undefined,
  vaiTro: CoSoStaffVaiTro | null | undefined,
): Promise<Record<CoSoModuleKey, CoSoMucQuyen>> {
  if (isCoSoFounderTier(vaiTro)) return fullQuyenMap("sua");

  const base = fullQuyenMap("an");
  if (!actorId || !vaiTro) return base;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_thanh_vien_quyen")
    .select("module, muc_quyen")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", actorId);

  for (const row of data ?? []) {
    const module = row.module as string;
    if (!isCoSoModuleKey(module)) continue;
    base[module] = row.muc_quyen === "sua" ? "sua" : "xem";
  }
  return base;
}

/** Quyền của 1 module cụ thể — tiện dùng trong route khi chỉ cần 1 giá trị. */
export async function getCoSoModuleQuyen(
  orgId: string,
  actorId: string | null | undefined,
  vaiTro: CoSoStaffVaiTro | null | undefined,
  module: CoSoModuleKey,
): Promise<CoSoMucQuyen> {
  const map = await getCoSoQuyenMap(orgId, actorId, vaiTro);
  return map[module];
}

/** Vào dashboard `/co-so/[slug]/quan-ly`: founder tier, hoặc có ≥1 module ≠ "an". */
export async function canAccessCoSoQuanLyAsync(
  orgId: string,
  actorId: string | null | undefined,
  vaiTro: CoSoStaffVaiTro | null | undefined,
): Promise<boolean> {
  if (isCoSoFounderTier(vaiTro)) return true;
  if (!vaiTro) return false;
  const map = await getCoSoQuyenMap(orgId, actorId, vaiTro);
  return CO_SO_MODULE_KEYS.some((k) => map[k] !== "an");
}

/**
 * Curator org (nhãn sản phẩm): chỉ bài đăng + comment-as-org.
 * Map DB: `quan_ly_noi_dung` (không thêm enum). Ngoài phạm vi ma trận (nội dung
 * công khai org, không phải "kinh doanh" dashboard).
 */
export function canCurateCoSoBaiDang(
  vaiTro: CoSoStaffVaiTro | null | undefined,
): boolean {
  return (
    vaiTro === "owner" ||
    vaiTro === "admin" ||
    vaiTro === "quan_ly_noi_dung"
  );
}
