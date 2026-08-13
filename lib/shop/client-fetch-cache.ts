/**
 * Cache RAM ngắn hạn cho API Shop phía client — tránh waterfall
 * ReadyGate → child cùng gọi lại `/api/user/seller` khi đổi tab.
 */

import type { BaoCaoDoanhThu } from "@/app/api/shop/reports/route";
import {
  createCachedResource,
  registerClientCacheClear,
} from "@/lib/client-cache";
import type {
  ShopBangGia,
  ShopCuaHang,
  ShopDonHang,
  ShopNhom,
  ShopQuaySapCoMat,
  ShopSanPham,
  ShopStorefrontItem,
  ShopStorefrontNhomCard,
  ShopCombo,
  ShopVoucher,
} from "@/lib/shop/types";

const BAN_HANG_TTL_MS = 45_000;
const CUA_HANG_TTL_MS = 30_000;
const DON_HANG_TTL_MS = 20_000;
const BAO_CAO_TTL_MS = 45_000;

export type BanHangClientStatus = {
  enabled: boolean;
  shopVisible: boolean;
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
    shopVisible: boolean;
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
  invalidateDonHangCache();
  invalidateBaoCaoCache();
  invalidateDiaChiNhanCache();
  sanPhamCache.invalidateAll();
  bangGiaCache.invalidateAll();
  nhomCache.invalidateAll();
  matHangCache.invalidateAll();
  quaySapCoMatCache.invalidateAll();
  uuDaiCache.invalidateAll();
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
    const res = await fetch("/api/user/seller", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      enabled?: boolean;
      shopVisible?: boolean;
      shopReady?: boolean;
      shopSetupHref?: string | null;
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(json?.error ?? "Không tải được.");
    }
    const data: BanHangClientStatus = {
      enabled: json?.enabled === true,
      shopVisible: json?.enabled === true && json?.shopVisible === true,
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
      shopVisible?: boolean;
      isOwner?: boolean;
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(json?.error ?? "Không tải được cửa hàng.");
    }
    const data = {
      shop: json?.shop ?? null,
      banHangBat: json?.banHangBat === true,
      shopVisible: json?.shopVisible === true,
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
  opts?: {
    slug?: string | null;
    banHangBat?: boolean;
    shopVisible?: boolean;
    isOwner?: boolean;
  },
) {
  const key = cuaHangKey(opts?.slug);
  const prev = cuaHangByKey.get(key)?.data;
  cuaHangByKey.set(key, {
    at: Date.now(),
    data: {
      shop,
      banHangBat: opts?.banHangBat ?? prev?.banHangBat ?? false,
      shopVisible: opts?.shopVisible ?? prev?.shopVisible ?? false,
      isOwner: opts?.isOwner ?? prev?.isOwner ?? true,
    },
  });
}

// ─────────────────────────────────────────────
// Đơn hàng cache (seller list)
// ─────────────────────────────────────────────

type DonHangCache = { at: number; data: ShopDonHang[] };
let donHangCache: DonHangCache | null = null;
let donHangInflight: Promise<ShopDonHang[]> | null = null;

function readDonHangCache(): ShopDonHang[] | null {
  if (!donHangCache) return null;
  if (Date.now() - donHangCache.at > DON_HANG_TTL_MS) {
    donHangCache = null;
    return null;
  }
  return donHangCache.data;
}

export function peekDonHang(): ShopDonHang[] | null {
  return readDonHangCache();
}

export async function fetchDonHangCached(opts?: {
  force?: boolean;
}): Promise<ShopDonHang[]> {
  if (!opts?.force) {
    const hit = readDonHangCache();
    if (hit) return hit;
    if (donHangInflight) return donHangInflight;
  }

  const run = (async (): Promise<ShopDonHang[]> => {
    const res = await fetch("/api/shop/orders?role=seller", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      items?: ShopDonHang[];
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không tải đơn.");
    const data = json?.items ?? [];
    donHangCache = { at: Date.now(), data };
    return data;
  })();

  donHangInflight = run;
  try {
    return await run;
  } finally {
    if (donHangInflight === run) donHangInflight = null;
  }
}

/** Warm cache khi hover tab Đơn hàng — không throw. */
export function prefetchDonHang() {
  void fetchDonHangCached().catch(() => undefined);
}

export function invalidateDonHangCache() {
  donHangCache = null;
  donHangInflight = null;
}

// ─────────────────────────────────────────────
// Báo cáo doanh thu cache
// ─────────────────────────────────────────────

type BaoCaoCache = { at: number; data: BaoCaoDoanhThu };
let baoCaoCache: BaoCaoCache | null = null;
let baoCaoInflight: Promise<BaoCaoDoanhThu> | null = null;

function readBaoCaoCache(): BaoCaoDoanhThu | null {
  if (!baoCaoCache) return null;
  if (Date.now() - baoCaoCache.at > BAO_CAO_TTL_MS) {
    baoCaoCache = null;
    return null;
  }
  return baoCaoCache.data;
}

export function peekBaoCao(): BaoCaoDoanhThu | null {
  return readBaoCaoCache();
}

export async function fetchBaoCaoCached(opts?: {
  force?: boolean;
}): Promise<BaoCaoDoanhThu> {
  if (!opts?.force) {
    const hit = readBaoCaoCache();
    if (hit) return hit;
    if (baoCaoInflight) return baoCaoInflight;
  }

  const run = (async (): Promise<BaoCaoDoanhThu> => {
    const res = await fetch("/api/shop/reports", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as BaoCaoDoanhThu | null;
    if (!res.ok || !json) throw new Error("Không tải được báo cáo.");
    baoCaoCache = { at: Date.now(), data: json };
    return json;
  })();

  baoCaoInflight = run;
  try {
    return await run;
  } finally {
    if (baoCaoInflight === run) baoCaoInflight = null;
  }
}

/** Warm cache khi hover tab Báo cáo — không throw. */
export function prefetchBaoCao() {
  void fetchBaoCaoCached().catch(() => undefined);
}

export function invalidateBaoCaoCache() {
  baoCaoCache = null;
  baoCaoInflight = null;
}

// ─────────────────────────────────────────────
// Sổ địa chỉ nhận hàng (buyer checkout)
// ─────────────────────────────────────────────

/** Hồ sơ nhận hàng phía client — khớp `/api/shop/shipping-addresses`. */
export type ShopDiaChiNhanClient = {
  id: string;
  nhan: string | null;
  hoTen: string;
  soDienThoai: string;
  diaChi: string;
  phuongXa: string;
  tinhThanh: string;
  laMacDinh: boolean;
};

/** Ít đổi — TTL dài; invalidate khi thêm/sửa/xóa. */
const DIA_CHI_TTL_MS = 30 * 60_000;
const DIA_CHI_LS_KEY = "cins.shop.dia-chi-nhan.v1";

type DiaChiCache = { at: number; data: ShopDiaChiNhanClient[] };
let diaChiCache: DiaChiCache | null = null;
let diaChiInflight: Promise<ShopDiaChiNhanClient[]> | null = null;

function isDiaChiItem(x: unknown): x is ShopDiaChiNhanClient {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.hoTen === "string" &&
    typeof o.soDienThoai === "string" &&
    typeof o.diaChi === "string" &&
    typeof o.phuongXa === "string" &&
    typeof o.tinhThanh === "string" &&
    typeof o.laMacDinh === "boolean" &&
    (o.nhan === null || typeof o.nhan === "string")
  );
}

function readDiaChiLocalStorage(): DiaChiCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DIA_CHI_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: unknown; data?: unknown };
    if (
      typeof parsed.at !== "number" ||
      !Array.isArray(parsed.data) ||
      !parsed.data.every(isDiaChiItem)
    ) {
      window.localStorage.removeItem(DIA_CHI_LS_KEY);
      return null;
    }
    if (Date.now() - parsed.at > DIA_CHI_TTL_MS) {
      window.localStorage.removeItem(DIA_CHI_LS_KEY);
      return null;
    }
    return { at: parsed.at, data: parsed.data };
  } catch {
    return null;
  }
}

function writeDiaChiLocalStorage(cache: DiaChiCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DIA_CHI_LS_KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode — bỏ qua */
  }
}

function readDiaChiCache(): ShopDiaChiNhanClient[] | null {
  if (diaChiCache && Date.now() - diaChiCache.at <= DIA_CHI_TTL_MS) {
    return diaChiCache.data;
  }
  diaChiCache = null;
  const fromLs = readDiaChiLocalStorage();
  if (!fromLs) return null;
  diaChiCache = fromLs;
  return fromLs.data;
}

export function peekDiaChiNhan(): ShopDiaChiNhanClient[] | null {
  return readDiaChiCache();
}

export function writeDiaChiNhanCache(items: ShopDiaChiNhanClient[]) {
  const next: DiaChiCache = { at: Date.now(), data: items };
  diaChiCache = next;
  writeDiaChiLocalStorage(next);
}

export function invalidateDiaChiNhanCache() {
  diaChiCache = null;
  diaChiInflight = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(DIA_CHI_LS_KEY);
    } catch {
      /* ignore */
    }
  }
}

export async function fetchDiaChiNhanCached(opts?: {
  force?: boolean;
}): Promise<ShopDiaChiNhanClient[]> {
  if (!opts?.force) {
    const hit = readDiaChiCache();
    if (hit) return hit;
    if (diaChiInflight) return diaChiInflight;
  }

  const run = (async (): Promise<ShopDiaChiNhanClient[]> => {
    const res = await fetch("/api/shop/shipping-addresses", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      items?: ShopDiaChiNhanClient[];
      error?: string;
    } | null;
    if (res.status === 401) {
      invalidateDiaChiNhanCache();
      throw new Error(json?.error ?? "Chưa đăng nhập.");
    }
    if (!res.ok) throw new Error(json?.error ?? "Không tải sổ địa chỉ.");
    const data = (json?.items ?? []).filter(isDiaChiItem);
    writeDiaChiNhanCache(data);
    return data;
  })();

  diaChiInflight = run;
  try {
    return await run;
  } finally {
    if (diaChiInflight === run) diaChiInflight = null;
  }
}

// ─────────────────────────────────────────────
// Kho: sản phẩm / bảng giá / nhóm (TTL + invalidate khi sửa)
// ─────────────────────────────────────────────

export type ShopNhomListPayload = {
  items: ShopNhom[];
  orphanCount: number;
};

export type ShopMatHangPayload = {
  nhomCards: ShopStorefrontNhomCard[];
  items: ShopStorefrontItem[];
};

const sanPhamCache = createCachedResource<ShopSanPham[]>({
  keyPrefix: "shop:san-pham",
  ttlMs: 60_000,
  fetcher: async () => {
    const res = await fetch("/api/shop/products", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      items?: ShopSanPham[];
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không tải sản phẩm.");
    return json?.items ?? [];
  },
});

const bangGiaCache = createCachedResource<ShopBangGia[]>({
  keyPrefix: "shop:bang-gia",
  ttlMs: 120_000,
  fetcher: async () => {
    const res = await fetch("/api/shop/price-lists", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      items?: ShopBangGia[];
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không tải bảng giá.");
    return json?.items ?? [];
  },
});

const nhomCache = createCachedResource<ShopNhomListPayload>({
  keyPrefix: "shop:nhom",
  ttlMs: 120_000,
  fetcher: async () => {
    const res = await fetch("/api/shop/groups", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      items?: ShopNhom[];
      orphanCount?: number;
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không tải nhóm.");
    return {
      items: json?.items ?? [],
      orphanCount: json?.orphanCount ?? 0,
    };
  },
});

const matHangCache = createCachedResource<ShopMatHangPayload, [string]>({
  keyPrefix: "shop:mat-hang",
  ttlMs: 45_000,
  keyFromArgs: (slug) => slug,
  fetcher: async (slug) => {
    const res = await fetch(
      `/api/shop/store/category?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    const json = (await res.json().catch(() => null)) as {
      nhomCards?: ShopStorefrontNhomCard[];
      items?: ShopStorefrontItem[];
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không tải mặt hàng.");
    return {
      nhomCards: json?.nhomCards ?? [],
      items: json?.items ?? [],
    };
  },
});

const quaySapCoMatCache = createCachedResource<ShopQuaySapCoMat[], [string]>({
  keyPrefix: "shop:quay-sap-co-mat",
  ttlMs: 60_000,
  keyFromArgs: (slug) => slug,
  fetcher: async (slug) => {
    const res = await fetch(
      `/api/shop/booths/upcoming?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    const json = (await res.json().catch(() => null)) as {
      items?: ShopQuaySapCoMat[];
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không tải quầy.");
    return json?.items ?? [];
  },
});

export const peekSanPham = () => sanPhamCache.peek();
export const peekBangGia = () => bangGiaCache.peek();
export const peekNhom = () => nhomCache.peek();
export const peekMatHang = (slug: string) => matHangCache.peek(slug);

export async function fetchSanPhamCached(opts?: { force?: boolean }) {
  return sanPhamCache.fetch(opts);
}
export async function fetchBangGiaCached(opts?: { force?: boolean }) {
  return bangGiaCache.fetch(opts);
}
export async function fetchNhomCached(opts?: { force?: boolean }) {
  return nhomCache.fetch(opts);
}
export async function fetchMatHangCached(
  slug: string,
  opts?: { force?: boolean },
) {
  return matHangCache.fetch(slug, opts);
}
export async function fetchQuaySapCoMatCached(
  slug: string,
  opts?: { force?: boolean },
) {
  return quaySapCoMatCache.fetch(slug, opts);
}

export function writeSanPhamCache(items: ShopSanPham[]) {
  sanPhamCache.write(items);
}
export function writeBangGiaCache(items: ShopBangGia[]) {
  bangGiaCache.write(items);
}
export function writeNhomCache(payload: ShopNhomListPayload) {
  nhomCache.write(payload);
}

export function invalidateSanPhamCache() {
  sanPhamCache.invalidateAll();
}
export function invalidateBangGiaCache() {
  bangGiaCache.invalidateAll();
}
export function invalidateNhomCache() {
  nhomCache.invalidateAll();
}
export function invalidateMatHangCache(slug?: string) {
  if (slug) matHangCache.invalidate(slug);
  else matHangCache.invalidateAll();
}

export function prefetchKhoCatalog() {
  sanPhamCache.prefetch();
  bangGiaCache.prefetch();
  nhomCache.prefetch();
}

type UuDaiPayload = {
  combos: ShopCombo[];
  vouchers: ShopVoucher[];
};

const uuDaiCache = createCachedResource<UuDaiPayload>({
  keyPrefix: "shop:uu-dai",
  ttlMs: 60_000,
  fetcher: async () => {
    const [cRes, vRes] = await Promise.all([
      fetch("/api/shop/combos", { cache: "no-store" }),
      fetch("/api/shop/vouchers", { cache: "no-store" }),
    ]);
    if (!cRes.ok || !vRes.ok) throw new Error("UU_DAI_FETCH");
    const cJson = (await cRes.json()) as { items?: ShopCombo[] };
    const vJson = (await vRes.json()) as { items?: ShopVoucher[] };
    return {
      combos: cJson.items ?? [],
      vouchers: vJson.items ?? [],
    };
  },
});

export function prefetchUuDai() {
  uuDaiCache.prefetch();
}

export function peekUuDai() {
  return uuDaiCache.peek();
}

export function fetchUuDaiCached(opts?: { force?: boolean }) {
  return uuDaiCache.fetch(opts);
}

export function invalidateUuDaiCache() {
  uuDaiCache.invalidateAll();
}

registerClientCacheClear(() => {
  invalidateBanHangClientCache();
  cuaHangByKey.clear();
  cuaHangInflight.clear();
  invalidateDonHangCache();
  invalidateBaoCaoCache();
  invalidateDiaChiNhanCache();
}, "shop-legacy");
