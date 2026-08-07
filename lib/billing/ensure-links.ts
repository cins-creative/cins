import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { ensureDichVu, getOrCreateTk } from "./tk";

/**
 * Lazy: gắn dòng dịch vụ cho user đang xem hub
 * (org CSĐT họ là owner + shop của họ) — không chờ backfill.
 */
export async function ensureBillingLinksForUser(
  userId: string,
): Promise<void> {
  const admin = createServiceRoleClient();

  const { data: orgs } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc")
    .eq("id_nguoi_dung", userId)
    .eq("vai_tro", "owner")
    .eq("trang_thai", "active");

  const orgIds = ((orgs ?? []) as Array<{ id_to_chuc: string }>).map(
    (r) => r.id_to_chuc,
  );

  const { data: shop } = await admin
    .from("shop_cua_hang")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .maybeSingle<{ id: string }>();

  const { data: shopKy } = await admin
    .from("shop_phi_ky")
    .select("id")
    .eq("id_nguoi_ban", userId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (orgIds.length === 0 && !shop?.id && !shopKy?.id) return;

  const tk = await getOrCreateTk(userId);

  for (const orgId of orgIds) {
    const { data: org } = await admin
      .from("org_to_chuc")
      .select("loai_to_chuc")
      .eq("id", orgId)
      .maybeSingle<{ loai_to_chuc: string }>();
    if (org?.loai_to_chuc !== "co_so_dao_tao") continue;
    await ensureDichVu({
      idTk: tk.id,
      loai: "csdt_phi",
      thamChieuId: orgId,
    });
  }

  if (shop?.id || shopKy?.id) {
    await ensureDichVu({
      idTk: tk.id,
      loai: "shop_phi",
      thamChieuId: userId,
    });
  }
}
