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

export async function assertBanHangEnabled(userId: string): Promise<void> {
  const on = await getBanHangEnabled(userId);
  if (!on) {
    throw new Error("BAN_HANG_OFF");
  }
}

export type BanHangSettings = {
  enabled: boolean;
  termsAcceptedAt: string | null;
};

export async function getBanHangSettings(
  userId: string,
): Promise<BanHangSettings> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ban_hang_bat, ban_hang_dieu_khoan_luc")
    .eq("id", userId)
    .maybeSingle<{
      ban_hang_bat: boolean | null;
      ban_hang_dieu_khoan_luc: string | null;
    }>();
  return {
    enabled: data?.ban_hang_bat === true,
    termsAcceptedAt: data?.ban_hang_dieu_khoan_luc ?? null,
  };
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
  }
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .update(patch)
    .eq("id", userId)
    .select("ban_hang_bat, ban_hang_dieu_khoan_luc")
    .maybeSingle<{
      ban_hang_bat: boolean | null;
      ban_hang_dieu_khoan_luc: string | null;
    }>();
  if (error) {
    console.error("[shop] setBanHangEnabled", error);
    throw new Error("UPDATE_FAILED");
  }
  return {
    enabled: data?.ban_hang_bat === true,
    termsAcceptedAt: data?.ban_hang_dieu_khoan_luc ?? null,
  };
}
