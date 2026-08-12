import "server-only";

import { SHOP_DANG_KY_MO_SUBMIT_LIMIT } from "@/lib/shop/dang-ky-mo-constants";
import type { ShopDangKyMoSlotStatus } from "@/lib/shop/dang-ky-mo-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { ShopDangKyMoSlotStatus } from "@/lib/shop/dang-ky-mo-types";

/** Đếm lead /mo-shop đã gửi — giới hạn suất concierge. */
export async function getShopDangKyMoSlotStatus(): Promise<ShopDangKyMoSlotStatus> {
  const limit = SHOP_DANG_KY_MO_SUBMIT_LIMIT;
  try {
    const admin = createServiceRoleClient();
    const { count, error } = await admin
      .from("shop_dang_ky_mo")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("[shop] getShopDangKyMoSlotStatus", error.message);
      return { limit, submitted: 0, remaining: limit };
    }

    const submitted = count ?? 0;
    return {
      limit,
      submitted,
      remaining: Math.max(0, limit - submitted),
    };
  } catch (err) {
    console.error("[shop] getShopDangKyMoSlotStatus", err);
    return { limit, submitted: 0, remaining: limit };
  }
}

export async function isShopDangKyMoFull(): Promise<boolean> {
  const { remaining } = await getShopDangKyMoSlotStatus();
  return remaining <= 0;
}
