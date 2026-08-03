import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";

import type {
  HomeCapabilities,
  HomeCapability,
} from "@/lib/cins/home-adaptive/capability-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type {
  HomeCapabilities,
  HomeCapability,
} from "@/lib/cins/home-adaptive/capability-types";
export {
  hasAllCapabilities,
  hasAnyCapability,
  moduleMatchesCapabilities,
  serializeHomeCapabilities,
} from "@/lib/cins/home-adaptive/capability-types";

const STAFF_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
] as const;

/**
 * Capability đổi khi viewer mở shop / vào tổ chức / ứng tuyển — đều là hành động
 * ngoài trang chủ, nên chấp nhận trễ tối đa `REVALIDATE_SEC` thay vì bắn 8 query
 * mỗi lần tải trang. Gọi `revalidateHomeCapabilities` nếu cần thấy ngay.
 */
const CAPABILITIES_REVALIDATE_SEC = 60;

function capabilitiesTag(viewerId: string): string {
  return `home-caps:${viewerId}`;
}

export function revalidateHomeCapabilities(viewerId: string): void {
  revalidateTag(capabilitiesTag(viewerId), "max");
}

/** Chỉ `count` head — rẻ. Một query membership dùng cho cả `thanh_vien` + `staff`. */
async function readCapabilityList(
  viewerId: string,
): Promise<HomeCapability[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const caps = new Set<HomeCapability>();

  const [shopRes, buyRes, hocRes, memberRes, ungTuyenRes] = await Promise.all([
    admin
      .from("shop_cua_hang")
      .select("id", { head: true, count: "exact" })
      .eq("id_nguoi_dung", viewerId)
      .eq("da_xoa", false),
    admin
      .from("shop_don_hang")
      .select("id", { head: true, count: "exact" })
      .eq("id_nguoi_mua", viewerId)
      .neq("trang_thai", "nhap"),
    admin
      .from("user_hoc_vien_lop")
      .select("id", { head: true, count: "exact" })
      .eq("id_nguoi_dung", viewerId)
      .in("trang_thai", ["da_dang_ky", "dang_hoc"]),
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_to_chuc, vai_tro")
      .eq("id_nguoi_dung", viewerId)
      .eq("trang_thai", "active")
      .returns<Array<{ id_to_chuc: string; vai_tro: string }>>(),
    admin
      .from("org_tuyen_dung_ung_tuyen")
      .select("id", { head: true, count: "exact" })
      .eq("id_nguoi_dung", viewerId),
  ]);

  if ((shopRes.count ?? 0) > 0) caps.add("co_shop");
  if ((buyRes.count ?? 0) > 0) caps.add("da_mua_hang");
  if ((hocRes.count ?? 0) > 0) caps.add("dang_hoc_khoa");
  const memberRows = memberRes.data ?? [];
  if (memberRows.length > 0) caps.add("org_thanh_vien");
  if ((ungTuyenRes.count ?? 0) > 0) caps.add("da_ung_tuyen");

  const staffRoles = new Set<string>(STAFF_ROLES);
  const staffOrgIds = [
    ...new Set(
      memberRows
        .filter((r) => staffRoles.has(r.vai_tro))
        .map((r) => r.id_to_chuc),
    ),
  ];
  if (staffOrgIds.length > 0) {
    caps.add("org_staff");

    const [suKienRes, tuyenDungRes] = await Promise.all([
      admin
        .from("org_su_kien")
        .select("id", { head: true, count: "exact" })
        .in("id_to_chuc", staffOrgIds)
        .gte("bat_dau", now),
      admin
        .from("org_tuyen_dung")
        .select("id", { head: true, count: "exact" })
        .in("id_to_chuc", staffOrgIds)
        .eq("trang_thai", "dang_mo")
        .eq("da_xoa", false),
    ]);

    if ((suKienRes.count ?? 0) > 0) caps.add("su_kien_admin");
    if ((tuyenDungRes.count ?? 0) > 0) caps.add("studio_tuyen_dung");
  }

  return [...caps];
}

/**
 * Tập capability của viewer — dedupe trong request (react.cache) + cache giữa các
 * request theo tag. `unstable_cache` serialize JSON nên phần cache giữ mảng, Set
 * chỉ dựng lại ở ngoài.
 */
export const loadHomeCapabilities = cache(
  async (viewerId: string): Promise<HomeCapabilities> => {
    const list = await unstable_cache(
      () => readCapabilityList(viewerId),
      ["home-capabilities", viewerId],
      {
        revalidate: CAPABILITIES_REVALIDATE_SEC,
        tags: [capabilitiesTag(viewerId)],
      },
    )();
    return new Set(list);
  },
);
