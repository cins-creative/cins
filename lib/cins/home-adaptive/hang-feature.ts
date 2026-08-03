import "server-only";

import type { HangFeatureItem } from "@/lib/cins/home-adaptive/hang-feature-types";
import {
  shopLoaiMauHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import { shopImageUrl } from "@/lib/shop/settings";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { HangFeatureItem } from "@/lib/cins/home-adaptive/hang-feature-types";

/** Đổi lô gợi ý mỗi 6 giờ (seed ổn định trong bucket). */
export const HANG_FEATURE_BUCKET_HOURS = 6;

const FRIEND_CAP = 80;
const POOL_FRIEND_FEATURE = 40;
const POOL_FRIEND_NEW = 30;
const POOL_DISCOVERY = 40;
const DISCOVERY_SELLER_CAP = 60;

type SpRow = {
  id: string;
  ten: string | null;
  anh_id: string | null;
  id_nhom: string | null;
  id_nguoi_dung: string;
  noi_bat: boolean | null;
  tao_luc: string | null;
};

type SellerMeta = {
  id: string;
  slug: string;
  tenHienThi: string | null;
  shopTen: string | null;
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function currentBucket(): number {
  return Math.floor(Date.now() / 1000 / 3600 / HANG_FEATURE_BUCKET_HOURS);
}

function parseGia(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function loadPublicSellers(
  admin: ReturnType<typeof createServiceRoleClient>,
  ids: string[],
): Promise<Map<string, SellerMeta>> {
  const out = new Map<string, SellerMeta>();
  if (ids.length === 0) return out;

  const { data: users, error } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, ban_hang_bat, shop_hien_thi")
    .in("id", ids)
    .eq("ban_hang_bat", true)
    .eq("shop_hien_thi", true)
    .returns<
      Array<{
        id: string;
        slug: string | null;
        ten_hien_thi: string | null;
        ban_hang_bat: boolean | null;
        shop_hien_thi: boolean | null;
      }>
    >();

  if (error) {
    console.error("[hang-feature] sellers", error);
    return out;
  }

  const publicIds = (users ?? [])
    .filter((u) => u.slug?.trim())
    .map((u) => u.id);
  if (publicIds.length === 0) return out;

  const { data: shops } = await admin
    .from("shop_cua_hang")
    .select("id, ten")
    .in("id", publicIds)
    .eq("da_xoa", false)
    .returns<Array<{ id: string; ten: string | null }>>();

  const shopTenById = new Map(
    (shops ?? []).map((s) => [s.id, s.ten?.trim() || null] as const),
  );

  for (const u of users ?? []) {
    const slug = u.slug?.trim();
    if (!slug) continue;
    out.set(u.id, {
      id: u.id,
      slug,
      tenHienThi: u.ten_hien_thi?.trim() || null,
      shopTen: shopTenById.get(u.id) ?? null,
    });
  }
  return out;
}

async function fetchSanPhamPool(
  admin: ReturnType<typeof createServiceRoleClient>,
  sellerIds: string[],
  opts: {
    noiBat?: boolean;
    limit: number;
    /** Ưu tiên SP có ảnh — vẫn trả thêm không ảnh nếu không đủ. */
    preferWithAnh?: boolean;
    excludeSellerIds?: Set<string>;
  },
): Promise<SpRow[]> {
  if (sellerIds.length === 0) return [];

  const base = () => {
    let q = admin
      .from("shop_san_pham")
      .select("id, ten, anh_id, id_nhom, id_nguoi_dung, noi_bat, tao_luc")
      .in("id_nguoi_dung", sellerIds)
      .eq("da_xoa", false)
      .eq("dang_ban", true)
      .not("id_nhom", "is", null)
      .order("noi_bat", { ascending: false })
      .order("tao_luc", { ascending: false });
    if (opts.noiBat === true) q = q.eq("noi_bat", true);
    if (opts.noiBat === false) q = q.eq("noi_bat", false);
    return q;
  };

  const filterRows = (rows: SpRow[] | null): SpRow[] => {
    const exclude = opts.excludeSellerIds;
    return (rows ?? []).filter((row) => {
      if (!row.id_nhom?.trim() || !row.ten?.trim()) return false;
      if (exclude?.has(row.id_nguoi_dung)) return false;
      return true;
    });
  };

  if (opts.preferWithAnh) {
    const { data: withAnh, error: errAnh } = await base()
      .not("anh_id", "is", null)
      .limit(opts.limit)
      .returns<SpRow[]>();
    if (errAnh) {
      console.error("[hang-feature] san_pham anh", errAnh);
    }
    const primary = filterRows(withAnh ?? null);
    if (primary.length >= opts.limit) return primary.slice(0, opts.limit);

    const have = new Set(primary.map((r) => r.id));
    const { data: rest, error: errRest } = await base()
      .limit(opts.limit)
      .returns<SpRow[]>();
    if (errRest) {
      console.error("[hang-feature] san_pham", errRest);
      return primary;
    }
    for (const row of filterRows(rest ?? null)) {
      if (have.has(row.id)) continue;
      primary.push(row);
      have.add(row.id);
      if (primary.length >= opts.limit) break;
    }
    return primary;
  }

  const { data, error } = await base().limit(opts.limit).returns<SpRow[]>();
  if (error) {
    console.error("[hang-feature] san_pham", error);
    return [];
  }
  return filterRows(data ?? null);
}

type NhomMeta = {
  nhan: string | null;
  gia: number | null;
  anhId: string | null;
};

async function enrichNhomMeta(
  admin: ReturnType<typeof createServiceRoleClient>,
  nhomIds: string[],
): Promise<Map<string, NhomMeta>> {
  const out = new Map<string, NhomMeta>();
  if (nhomIds.length === 0) return out;
  const { data, error } = await admin
    .from("shop_nhom")
    .select("id, nhan, gia_mac_dinh, anh_id")
    .in("id", nhomIds)
    .eq("da_xoa", false)
    .returns<
      Array<{
        id: string;
        nhan: string | null;
        gia_mac_dinh: number | string | null;
        anh_id: string | null;
      }>
    >();
  if (error) {
    console.error("[hang-feature] nhom", error);
    return out;
  }
  for (const row of data ?? []) {
    out.set(row.id, {
      nhan: row.nhan?.trim() || null,
      gia: parseGia(row.gia_mac_dinh),
      anhId: row.anh_id?.trim() || null,
    });
  }
  return out;
}

type Scored = SpRow & {
  fromFriend: boolean;
  tier: "A" | "B" | "C";
  score: number;
  complete: boolean;
};

function rowThumbId(row: SpRow, nhom: NhomMeta | undefined): string | null {
  return row.anh_id?.trim() || nhom?.anhId || null;
}

/** Đủ thông tin để hiện đẹp: tên + loại + thumbnail (SP hoặc loại). */
function isCompleteRow(row: SpRow, nhom: NhomMeta | undefined): boolean {
  if (!row.ten?.trim() || !row.id_nhom?.trim()) return false;
  return Boolean(rowThumbId(row, nhom));
}

function scoreRow(
  row: SpRow,
  fromFriend: boolean,
  tier: "A" | "B" | "C",
  seen: Set<string>,
  nhom: NhomMeta | undefined,
): Scored {
  let score = 0;
  if (tier === "A") score += 100;
  else if (tier === "B") score += 60;
  else score += 30;
  if (row.noi_bat) score += 20;
  if (fromFriend) score += 15;
  if (row.tao_luc) {
    const ageH =
      (Date.now() - new Date(row.tao_luc).getTime()) / (1000 * 3600);
    if (ageH < 72) score += 10;
    else if (ageH < 168) score += 5;
  }

  const hasSpAnh = Boolean(row.anh_id?.trim());
  const hasNhomAnh = Boolean(nhom?.anhId);
  if (hasSpAnh) score += 45;
  else if (hasNhomAnh) score += 38;
  else score -= 90;

  if (nhom?.gia != null) score += 18;
  if (nhom?.nhan) score += 12;

  if (seen.has(row.id)) score -= 50;

  return {
    ...row,
    fromFriend,
    tier,
    score,
    complete: isCompleteRow(row, nhom),
  };
}

/**
 * Gợi ý SP feature — ưu tiên shop bạn bè, fill discovery; roll theo bucket 6h.
 * Ưu tiên loại/SP đủ thông tin (có thumbnail). Click → trang loại hàng.
 */
export async function loadHangFeature(
  viewerId: string,
  opts: {
    limit?: number;
    /** SP đã hiện gần đây — hạ điểm / tránh lặp. */
    excludeIds?: readonly string[];
  } = {},
): Promise<HangFeatureItem[]> {
  const limit = Math.min(10, Math.max(1, Math.round(opts.limit ?? 3)));
  const seen = new Set(
    (opts.excludeIds ?? []).map((id) => id.trim()).filter(Boolean),
  );
  const admin = createServiceRoleClient();

  const friendIds = (await listFriends(viewerId))
    .filter((id) => id !== viewerId)
    .slice(0, FRIEND_CAP);

  const friendSellers = await loadPublicSellers(admin, friendIds);
  const friendSellerIds = [...friendSellers.keys()];

  const [friendFeature, friendNew] = await Promise.all([
    fetchSanPhamPool(admin, friendSellerIds, {
      noiBat: true,
      limit: POOL_FRIEND_FEATURE,
      preferWithAnh: true,
    }),
    fetchSanPhamPool(admin, friendSellerIds, {
      noiBat: false,
      limit: POOL_FRIEND_NEW,
      preferWithAnh: true,
    }),
  ]);

  const friendSpIds = new Set([
    ...friendFeature.map((r) => r.id),
    ...friendNew.map((r) => r.id),
  ]);

  /* Discovery: seller public khác bạn (và khác chính mình). */
  const { data: discoveryUsers } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("ban_hang_bat", true)
    .eq("shop_hien_thi", true)
    .neq("id", viewerId)
    .limit(DISCOVERY_SELLER_CAP + friendSellerIds.length)
    .returns<Array<{ id: string }>>();

  const friendSet = new Set(friendSellerIds);
  const discoveryCandidateIds = (discoveryUsers ?? [])
    .map((u) => u.id)
    .filter((id) => !friendSet.has(id))
    .slice(0, DISCOVERY_SELLER_CAP);

  const discoverySellers = await loadPublicSellers(
    admin,
    discoveryCandidateIds,
  );
  const discoverySp = await fetchSanPhamPool(
    admin,
    [...discoverySellers.keys()],
    { noiBat: true, limit: POOL_DISCOVERY, preferWithAnh: true },
  );

  const allSellers = new Map<string, SellerMeta>([
    ...friendSellers,
    ...discoverySellers,
  ]);

  const candidateRows: Array<{
    row: SpRow;
    fromFriend: boolean;
    tier: "A" | "B" | "C";
  }> = [];
  const pushUnique = (
    rows: SpRow[],
    fromFriend: boolean,
    tier: "A" | "B" | "C",
  ) => {
    for (const row of rows) {
      if (tier === "C" && friendSpIds.has(row.id)) continue;
      candidateRows.push({ row, fromFriend, tier });
    }
  };
  pushUnique(friendFeature, true, "A");
  pushUnique(friendNew, true, "B");
  pushUnique(discoverySp, false, "C");

  const nhomIdsAll = [
    ...new Set(
      candidateRows
        .map((c) => c.row.id_nhom?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nhomMeta = await enrichNhomMeta(admin, nhomIdsAll);

  const scored: Scored[] = candidateRows.map(({ row, fromFriend, tier }) =>
    scoreRow(
      row,
      fromFriend,
      tier,
      seen,
      nhomMeta.get(row.id_nhom!.trim()),
    ),
  );

  /* Dedupe theo sanPhamId — giữ score cao nhất. */
  const bestById = new Map<string, Scored>();
  for (const row of scored) {
    const prev = bestById.get(row.id);
    if (!prev || row.score > prev.score) bestById.set(row.id, row);
  }

  const bucket = currentBucket();
  const seed = hashSeed(`${viewerId}|${bucket}`);
  const pool = seededShuffle([...bestById.values()], seed).sort(
    (a, b) =>
      Number(b.complete) - Number(a.complete) ||
      b.score - a.score ||
      a.id.localeCompare(b.id),
  );

  const maxPerShop = limit >= 6 ? 2 : 1;

  function pickFrom(
    source: Scored[],
    onlyComplete: boolean,
    into: Scored[],
    perShop: Map<string, number>,
    usedNhom: Set<string>,
  ) {
    for (const row of source) {
      if (into.length >= limit) break;
      if (onlyComplete && !row.complete) continue;
      if (into.some((p) => p.id === row.id)) continue;
      const nhomId = row.id_nhom!.trim();
      if (usedNhom.has(nhomId)) continue;
      const n = perShop.get(row.id_nguoi_dung) ?? 0;
      if (n >= maxPerShop) continue;
      into.push(row);
      perShop.set(row.id_nguoi_dung, n + 1);
      usedNhom.add(nhomId);
    }
  }

  const picked: Scored[] = [];
  const perShop = new Map<string, number>();
  const usedNhom = new Set<string>();

  /* Pass 1: chỉ đủ thông tin (có thumb). Pass 2: nới nếu vẫn thiếu. */
  pickFrom(pool, true, picked, perShop, usedNhom);
  if (picked.length < limit) {
    pickFrom(pool, false, picked, perShop, usedNhom);
  }
  /* Pass 3: nới unique nhom nếu vẫn thiếu. */
  if (picked.length < limit) {
    for (const row of pool) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.id === row.id)) continue;
      const n = perShop.get(row.id_nguoi_dung) ?? 0;
      if (n >= maxPerShop) continue;
      picked.push(row);
      perShop.set(row.id_nguoi_dung, n + 1);
    }
  }

  const items: HangFeatureItem[] = [];
  for (const row of picked) {
    const seller = allSellers.get(row.id_nguoi_dung);
    if (!seller) continue;
    const nhomId = row.id_nhom!.trim();
    const meta = nhomMeta.get(nhomId);
    const shopSlug = shopSlugFromTen(seller.shopTen, seller.slug);
    const thumbId = rowThumbId(row, meta);
    items.push({
      sanPhamId: row.id,
      idNhom: nhomId,
      tenSanPham: row.ten!.trim(),
      tenNhom: meta?.nhan ?? null,
      anhUrl: shopImageUrl(thumbId),
      giaHienThi: meta?.gia ?? null,
      shopTen: seller.shopTen,
      ownerName: seller.tenHienThi,
      ownerSlug: seller.slug,
      shopSlug,
      href: shopLoaiMauHref(seller.slug, shopSlug, nhomId, row.id),
      fromFriend: row.fromFriend,
    });
  }

  return items;
}

/** Parse cookie `cins-hang-feature-seen` (csv ids). */
export function parseHangFeatureSeenCookie(
  raw: string | undefined | null,
): string[] {
  if (!raw?.trim()) return [];
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* giữ raw */
  }
  return decoded
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}
