/**
 * Cache RAM ngắn hạn cho API Shop phía client — tránh waterfall
 * ReadyGate → child cùng gọi lại `/api/user/ban-hang` khi đổi tab.
 */

import type { ShopCuaHang } from "@/lib/shop/types";

const BAN_HANG_TTL_MS = 45_000;
const CUA_HANG_TTL_MS = 30_000;

export type BanHangClientStatus = {
  enabled: boolean;
  shopReady: boolean;
  shopSetupHref: string | null;
};

type BanHangCache = {
  at: number;
  data: BanHangClientStatus;
};

type CuaHangCache = {
  at: number;
  data: {
    shop: ShopCuaHang | null;
    banHangBat: boolean;
    isOwner: boolean;
  };
};

let banHangCache: BanHangCache | null = null;
let banHangInflight: Promise<BanHangClientStatus> | null = null;

const cuaHangByKey = new Map<string, CuaHangCache>();
const cuaHangInflight = new Map<string, Promise<CuaHangCache["data"]>>();

export function invalidateBanHangClientCache() {
  banHangCache = null;
  banHangInflight = null;
}

export function invalidateShopClientCaches() {
  invalidateBanHangClientCache();
  cuaHangByKey.clear();
  cuaHangInflight.clear();
}

function readBanHangCache(): BanHangClientStatus | null {
  if (!banHangCache) return null;
  if (Date.now() - banHangCache.at > BAN_HANG_TTL_MS) {
    banHangCache = null;
    return null;
  }
  return banHangCache.data;
}

export function peekBanHangClientStatus(): BanHangClientStatus | null {
  return readBanHangCache();
}

export async function fetchBanHangClientStatus(opts?: {
  force?: boolean;
}): Promise<BanHangClientStatus> {
  if (!opts?.force) {
    const hit = readBanHangCache();
    if (hit) return hit;
    if (banHangInflight) return banHangInflight;
  }

  const run = (async (): Promise<BanHangClientStatus> => {
    const res = await fetch("/api/user/ban-hang", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      enabled?: boolean;
      shopReady?: boolean;
      shopSetupHref?: string | null;
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(json?.error ?? "Không tải được.");
    }
    const data: BanHangClientStatus = {
      enabled: json?.enabled === true,
      shopReady: json?.shopReady === true,
      shopSetupHref:
        typeof json?.shopSetupHref === "string" ? json.shopSetupHref : null,
    };
    banHangCache = { at: Date.now(), data };
    return data;
  })();

  banHangInflight = run;
  try {
    return await run;
  } finally {
    if (banHangInflight === run) banHangInflight = null;
  }
}

/** Warm cache khi hover link /ban-hang/* — không throw. */
export function prefetchBanHangClientStatus() {
  void fetchBanHangClientStatus().catch(() => undefined);
}

function cuaHangKey(slug?: string | null): string {
  const s = slug?.trim();
  return s ? `slug:${s}` : "self";
}

export async function fetchShopCuaHangClient(opts?: {
  slug?: string | null;
  force?: boolean;
}): Promise<CuaHangCache["data"]> {
  const key = cuaHangKey(opts?.slug);
  if (!opts?.force) {
    const hit = cuaHangByKey.get(key);
    if (hit && Date.now() - hit.at <= CUA_HANG_TTL_MS) return hit.data;
    const pending = cuaHangInflight.get(key);
    if (pending) return pending;
  }

  const run = (async (): Promise<CuaHangCache["data"]> => {
    const qs = opts?.slug?.trim()
      ? `?slug=${encodeURIComponent(opts.slug.trim())}`
      : "";
    const res = await fetch(`/api/shop/cua-hang${qs}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      shop?: ShopCuaHang | null;
      banHangBat?: boolean;
      isOwner?: boolean;
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(json?.error ?? "Không tải được cửa hàng.");
    }
    const data = {
      shop: json?.shop ?? null,
      banHangBat: json?.banHangBat === true,
      isOwner: json?.isOwner === true,
    };
    cuaHangByKey.set(key, { at: Date.now(), data });
    return data;
  })();

  cuaHangInflight.set(key, run);
  try {
    return await run;
  } finally {
    if (cuaHangInflight.get(key) === run) cuaHangInflight.delete(key);
  }
}

export function prefetchShopCuaHangClient(slug?: string | null) {
  void fetchShopCuaHangClient({ slug }).catch(() => undefined);
}

export function writeShopCuaHangCache(
  shop: ShopCuaHang | null,
  opts?: { slug?: string | null; banHangBat?: boolean; isOwner?: boolean },
) {
  const key = cuaHangKey(opts?.slug);
  const prev = cuaHangByKey.get(key)?.data;
  cuaHangByKey.set(key, {
    at: Date.now(),
    data: {
      shop,
      banHangBat: opts?.banHangBat ?? prev?.banHangBat ?? false,
      isOwner: opts?.isOwner ?? prev?.isOwner ?? true,
    },
  });
}
