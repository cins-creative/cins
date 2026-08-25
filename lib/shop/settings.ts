import "server-only";

import { getCfAccountHash } from "@/lib/cloudflare/account-hash";
import type { CfNamedVariant } from "@/lib/cloudflare/cf-image-variants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Lỗi kết nối Worker↔Supabase (fetch failed / timeout / DNS / 5xx gateway) thường
 * chập chờn. Trên Cloudflare (HTTP/2) `statusText` rỗng nên supabase-js có thể trả
 * `error.message === ""` — cần coi là transient để retry thay vì báo lỗi chết.
 */
function isTransientDbError(info: {
  message?: string | null;
  code?: string | null;
}): boolean {
  const msg = (info.message ?? "").toLowerCase();
  if (msg === "") return true; // HTTP/2 statusText rỗng → lỗi mạng bị che
  return [
    "fetch failed",
    "failed to fetch",
    "network",
    "timeout",
    "timed out",
    "etimedout",
    "enotfound",
    "econnreset",
    "econnrefused",
    "socket hang up",
    "gateway",
    "502",
    "503",
    "504",
  ].some((k) => msg.includes(k));
}

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

/** Chuyển `error` của supabase-js thành Error có cờ `transient` để retry phân loại. */
function toDbError(err: SupabaseErrorLike | null, fallback: string): Error {
  const e = new Error(err?.message || fallback) as Error & {
    transient?: boolean;
    supabase?: SupabaseErrorLike | null;
  };
  e.transient = isTransientDbError(err ?? {});
  e.supabase = err ?? null;
  return e;
}

/**
 * Chạy một thao tác DB với retry ngắn khi gặp lỗi transient (mạng/timeout).
 * - Lỗi permanent (SQL/permission/thiếu env) → ném ngay, giữ nguyên message thật.
 * - Hết lượt mà vẫn transient → ném `DB_UNREACHABLE` (kèm `cause`) để tầng trên báo "thử lại".
 */
async function withDbRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const flagged = Boolean((e as { transient?: boolean } | null)?.transient);
      const transient =
        flagged ||
        isTransientDbError({
          message: e instanceof Error ? e.message : String(e ?? ""),
        });
      if (!transient) throw e;
      if (i === attempts - 1) {
        console.error(`[shop] ${label} transient exhausted`, e);
        const wrapped = new Error("DB_UNREACHABLE") as Error & {
          cause?: unknown;
        };
        wrapped.cause = e;
        throw wrapped;
      }
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw lastErr;
}

export function shopImageUrl(
  imageId: string | null | undefined,
  variant: CfNamedVariant = "public",
): string | null {
  if (!imageId?.trim()) return null;
  const hash = getCfAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId.trim()}/${variant}`;
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
  const data = await withDbRetry("getBanHangSettings", async () => {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("user_nguoi_dung")
      .select("ban_hang_bat, shop_hien_thi, ban_hang_dieu_khoan_luc")
      .eq("id", userId)
      .maybeSingle<BanHangRow>();
    if (error) throw toDbError(error, "LOAD_FAILED");
    return data;
  });
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
  await withDbRetry("setBanHangEnabled", async () => {
    const { error } = await admin
      .from("user_nguoi_dung")
      .update(patch)
      .eq("id", userId);
    if (error) throw toDbError(error, "UPDATE_FAILED");
  });
  if (enabled) {
    try {
      const { seedShopKhachHangTagsIfEmpty } = await import(
        "@/lib/shop/khach-hang"
      );
      await seedShopKhachHangTagsIfEmpty(userId);
    } catch (seedErr) {
      console.error("[shop] seedShopKhachHangTagsIfEmpty", seedErr);
    }
  }
  return getBanHangSettings(userId);
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
  await withDbRetry("setShopHienThi", async () => {
    const { error } = await admin
      .from("user_nguoi_dung")
      .update({ shop_hien_thi: shopVisible && current.enabled })
      .eq("id", userId);
    if (error) throw toDbError(error, "UPDATE_FAILED");
  });
  return getBanHangSettings(userId);
}
