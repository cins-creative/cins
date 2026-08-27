import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";

import { congDongRootPath } from "@/lib/cong-dong/routes";
import {
  type ManagedEntity,
  type ManagedEntityKind,
} from "@/lib/cins/managed-entities-types";
import { manageSellerHref, webHref } from "@/lib/cins/manage-site";
import { getAvatarUrl } from "@/lib/journey/profile";
import { shopImageUrl } from "@/lib/shop/settings";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isOrgQuanLyKind,
  orgQuanLyPath,
  type OrgQuanLyKind,
} from "@/lib/to-chuc/org-quan-ly-routes";

export type { ManagedEntity, ManagedEntityKind } from "@/lib/cins/managed-entities-types";
export { managedEntityKindLabel } from "@/lib/cins/managed-entities-types";

const STAFF_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
] as const;

/** Loại hiện trong botbar «Quản lý tổ chức» — không gồm trường / doanh nghiệp. */
const ORG_KINDS = new Set(["co_so_dao_tao", "studio", "cong_dong"]);

const REVALIDATE_SEC = 60;

function managedEntitiesTag(viewerId: string): string {
  return `managed-ent:${viewerId}`;
}

export function revalidateManagedEntities(viewerId: string): void {
  revalidateTag(managedEntitiesTag(viewerId), "max");
}

async function readManagedEntities(
  viewerId: string,
): Promise<ManagedEntity[]> {
  const admin = createServiceRoleClient();
  const out: ManagedEntity[] = [];

  const [shopRes, memberRes] = await Promise.all([
    admin
      .from("shop_cua_hang")
      .select("id, ten, avatar_id")
      .eq("id_nguoi_dung", viewerId)
      .eq("da_xoa", false)
      .order("cap_nhat_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        ten: string | null;
        avatar_id: string | null;
      }>(),
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_to_chuc, vai_tro")
      .eq("id_nguoi_dung", viewerId)
      .eq("trang_thai", "active")
      .in("vai_tro", [...STAFF_ROLES])
      .returns<Array<{ id_to_chuc: string; vai_tro: string }>>(),
  ]);

  if (shopRes.data?.id) {
    const shop = shopRes.data;
    out.push({
      kind: "shop",
      id: shop.id,
      ten: shop.ten?.trim() || "Shop của tôi",
      slug: shop.id,
      avatarUrl: shopImageUrl(shop.avatar_id, "avatar"),
      href: manageSellerHref("/seller/store"),
    });
  }

  const staffOrgIds = [
    ...new Set((memberRes.data ?? []).map((r) => r.id_to_chuc)),
  ];
  if (staffOrgIds.length === 0) return out;

  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc, avatar_id")
    .in("id", staffOrgIds)
    .returns<
      Array<{
        id: string;
        ten: string | null;
        slug: string;
        loai_to_chuc: string;
        avatar_id: string | null;
      }>
    >();

  for (const org of orgs ?? []) {
    if (!ORG_KINDS.has(org.loai_to_chuc)) continue;
    const kind = org.loai_to_chuc as ManagedEntityKind;
    const slug = org.slug?.trim();
    if (!slug) continue;

    let href: string;
    if (kind === "cong_dong") {
      href = webHref(congDongRootPath(slug));
    } else if (isOrgQuanLyKind(kind)) {
      href = orgQuanLyPath(kind as OrgQuanLyKind, slug);
    } else {
      continue;
    }

    out.push({
      kind,
      id: org.id,
      ten: org.ten?.trim() || slug,
      slug,
      avatarUrl: getAvatarUrl(org.avatar_id),
      href,
    });
  }

  return out;
}

/** Danh sách shop + org staff của viewer — cache 60s. */
export const loadManagedEntities = cache(
  async (viewerId: string): Promise<ManagedEntity[]> => {
    return unstable_cache(
      () => readManagedEntities(viewerId),
      ["managed-entities", viewerId],
      {
        revalidate: REVALIDATE_SEC,
        tags: [managedEntitiesTag(viewerId)],
      },
    )();
  },
);
