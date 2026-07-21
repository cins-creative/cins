import "server-only";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export function shopImageUrl(imageId: string | null | undefined): string | null {
  if (!imageId?.trim()) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId.trim()}/public`;
}

export async function getBanHangEnabled(userId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ban_hang_bat")
    .eq("id", userId)
    .maybeSingle<{ ban_hang_bat: boolean | null }>();
  return data?.ban_hang_bat === true;
}

/** Shop công khai trên Journey (tab + sản phẩm) — cần cả `ban_hang_bat`. */
export async function getShopHienThi(userId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ban_hang_bat, shop_hien_thi")
    .eq("id", userId)
    .maybeSingle<{
      ban_hang_bat: boolean | null;
      shop_hien_thi: boolean | null;
    }>();
  return data?.ban_hang_bat === true && data?.shop_hien_thi === true;
}

export async function assertBanHangEnabled(userId: string): Promise<void> {
  const on = await getBanHangEnabled(userId);
  if (!on) {
    throw new Error("BAN_HANG_OFF");
  }
}

export type BanHangSettings = {
  enabled: boolean;
  /** Hiện Shop trên Journey (public). Chỉ true khi `enabled`. */
  shopVisible: boolean;
  termsAcceptedAt: string | null;
};

type BanHangRow = {
  ban_hang_bat: boolean | null;
  shop_hien_thi: boolean | null;
  ban_hang_dieu_khoan_luc: string | null;
};

function rowToSettings(data: BanHangRow | null): BanHangSettings {
  const enabled = data?.ban_hang_bat === true;
  return {
    enabled,
    shopVisible: enabled && data?.shop_hien_thi === true,
    termsAcceptedAt: data?.ban_hang_dieu_khoan_luc ?? null,
  };
}

export async function getBanHangSettings(
  userId: string,
): Promise<BanHangSettings> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ban_hang_bat, shop_hien_thi, ban_hang_dieu_khoan_luc")
    .eq("id", userId)
    .maybeSingle<BanHangRow>();
  return rowToSettings(data);
}

export async function setBanHangEnabled(
  userId: string,
  enabled: boolean,
  acceptTerms: boolean,
): Promise<BanHangSettings> {
  const admin = createServiceRoleClient();
  if (enabled && !acceptTerms) {
    throw new Error("TERMS_REQUIRED");
  }
  const patch: Record<string, unknown> = {
    ban_hang_bat: enabled,
  };
  if (enabled) {
    patch.ban_hang_dieu_khoan_luc = new Date().toISOString();
  } else {
    /* Tắt bán hàng → ẩn shop công khai. */
    patch.shop_hien_thi = false;
  }
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .update(patch)
    .eq("id", userId)
    .select("ban_hang_bat, shop_hien_thi, ban_hang_dieu_khoan_luc")
    .maybeSingle<BanHangRow>();
  if (error) {
    console.error("[shop] setBanHangEnabled", error);
    throw new Error("UPDATE_FAILED");
  }
  return rowToSettings(data);
}

export async function setShopHienThi(
  userId: string,
  shopVisible: boolean,
): Promise<BanHangSettings> {
  const admin = createServiceRoleClient();
  const current = await getBanHangSettings(userId);
  if (shopVisible && !current.enabled) {
    throw new Error("BAN_HANG_OFF");
  }
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .update({ shop_hien_thi: shopVisible && current.enabled })
    .eq("id", userId)
    .select("ban_hang_bat, shop_hien_thi, ban_hang_dieu_khoan_luc")
    .maybeSingle<BanHangRow>();
  if (error) {
    console.error("[shop] setShopHienThi", error);
    throw new Error("UPDATE_FAILED");
  }
  return rowToSettings(data);
}
