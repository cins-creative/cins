import "server-only";

import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import type {
  PublicShopListingHang,
  PublicShopListingItem,
} from "@/lib/shop/cua-hang-listing-types";
import { shopImageUrl } from "@/lib/shop/settings";
import { isShopTamDongActive } from "@/lib/shop/tam-dong";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { PublicShopListingItem } from "@/lib/shop/cua-hang-listing-types";

const LIST_LIMIT = 100;
/** Số loại hàng hiện trên mỗi card hub. */
const FEATURED_HANG_PER_CARD = 3;

type ShopRow = {
  id: string;
  id_nguoi_dung: string;
  ten: string | null;
  mo_ta: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  tam_dong: boolean | null;
  tam_dong_tu: string | null;
  tam_dong_den: string | null;
  tam_dong_ly_do: string | null;
  tao_luc: string;
};

type OwnerRow = {
  id: string;
  slug: string | null;
  ten_hien_thi: string | null;
};

type ListingDraft = PublicShopListingItem & {
  completeness: number;
  /** Có ≥1 mẫu đang bán hoặc ≥1 loại hàng — sort cứng lên trước. */
  hasHang: boolean;
};

/** Điểm đủ thông tin mặt tiền (sau khi đã có hàng). */
function shopListingCompleteness(opts: {
  avatarUrl: string | null;
  coverUrl: string | null;
  moTa: string | null;
}): number {
  let score = 0;
  if (opts.avatarUrl) score += 2;
  if (opts.coverUrl) score += 2;
  if (opts.moTa) score += 1;
  return score;
}

/**
 * Owner có ≥1 mẫu đang bán (`shop_san_pham` · da_xoa=false · dang_ban).
 * Lặp theo batch còn lại để tránh một shop “ăn” hết limit.
 */
async function ownersWithHangBan(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  let remaining = ownerIds.filter(Boolean);
  while (remaining.length > 0) {
    const pageLimit = Math.min(Math.max(remaining.length * 2, 40), 400);
    const { data, error } = await admin
      .from("shop_san_pham")
      .select("id_nguoi_dung")
      .in("id_nguoi_dung", remaining)
      .eq("da_xoa", false)
      .eq("dang_ban", true)
      .limit(pageLimit)
      .returns<Array<{ id_nguoi_dung: string }>>();
    if (error) {
      console.error("[shop] listPublicShopCuaHang hang probe", error);
      break;
    }
    if (!data?.length) break;
    const before = found.size;
    for (const row of data) {
      if (row.id_nguoi_dung) found.add(row.id_nguoi_dung);
    }
    remaining = remaining.filter((id) => !found.has(id));
    if (found.size === before) break;
  }
  return found;
}

type NhomCatalogRow = {
  id: string;
  id_nguoi_dung: string;
  nhan: string;
  anh_id: string | null;
  noi_bat: boolean;
  thu_tu: number;
  gia_mac_dinh: number | string | null;
};

type NhomCatalogByOwner = {
  /** Tối đa 3 loại trên card: Feature trước, thiếu thì loại thường. */
  previewHang: PublicShopListingHang[];
  /** Toàn bộ loại (cap) — search + hiện khớp. */
  catalogHang: PublicShopListingHang[];
};

function parseGiaMacDinh(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function mapNhomToHang(r: NhomCatalogRow): PublicShopListingHang {
  return {
    id: r.id,
    ten: r.nhan.trim() || "Loại hàng",
    anhUrl: shopImageUrl(r.anh_id),
    giaHienThi: parseGiaMacDinh(r.gia_mac_dinh),
    tienTe: "VND",
  };
}

function sortNhomForPreview(a: NhomCatalogRow, b: NhomCatalogRow): number {
  const aImg = a.anh_id?.trim() ? 1 : 0;
  const bImg = b.anh_id?.trim() ? 1 : 0;
  if (aImg !== bImg) return bImg - aImg;
  return a.thu_tu - b.thu_tu;
}

/**
 * Catalog loại (truc=1): preview card (Feature → fallback thường) + list search.
 */
async function nhomCatalogByOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Map<string, NhomCatalogByOwner>> {
  const out = new Map<string, NhomCatalogByOwner>();
  if (ownerIds.length === 0) return out;

  const { data, error } = await admin
    .from("shop_nhom")
    .select("id, id_nguoi_dung, nhan, anh_id, noi_bat, thu_tu, gia_mac_dinh")
    .in("id_nguoi_dung", ownerIds)
    .eq("da_xoa", false)
    .eq("truc", 1)
    .order("thu_tu", { ascending: true })
    .limit(Math.min(ownerIds.length * 40, 2000))
    .returns<NhomCatalogRow[]>();

  if (error) {
    console.error("[shop] listPublicShopCuaHang nhom catalog", error);
    return out;
  }

  const buckets = new Map<string, NhomCatalogRow[]>();
  for (const row of data ?? []) {
    const list = buckets.get(row.id_nguoi_dung) ?? [];
    list.push(row);
    buckets.set(row.id_nguoi_dung, list);
  }

  for (const [ownerId, rows] of buckets) {
    const catalogHang = rows.map(mapNhomToHang);

    const starred = rows
      .filter((r) => r.noi_bat === true)
      .sort(sortNhomForPreview);
    const regular = rows
      .filter((r) => r.noi_bat !== true)
      .sort(sortNhomForPreview);

    const picked: NhomCatalogRow[] = [];
    const seen = new Set<string>();
    for (const r of [...starred, ...regular]) {
      if (picked.length >= FEATURED_HANG_PER_CARD) break;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      picked.push(r);
    }

    out.set(ownerId, {
      previewHang: picked.map(mapNhomToHang),
      catalogHang,
    });
  }

  return out;
}

const CATALOG_MAU_PER_OWNER = 40;

/** Mẫu đang bán — search + card kết quả hàng. */
async function sanPhamCatalogByOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Map<string, PublicShopListingHang[]>> {
  const out = new Map<string, PublicShopListingHang[]>();
  if (ownerIds.length === 0) return out;

  const { data, error } = await admin
    .from("shop_san_pham")
    .select("id, id_nguoi_dung, ten, anh_id, id_nhom")
    .in("id_nguoi_dung", ownerIds)
    .eq("da_xoa", false)
    .eq("dang_ban", true)
    .order("noi_bat", { ascending: false })
    .limit(Math.min(ownerIds.length * CATALOG_MAU_PER_OWNER, 2000))
    .returns<
      Array<{
        id: string;
        id_nguoi_dung: string;
        ten: string | null;
        anh_id: string | null;
        id_nhom: string | null;
      }>
    >();

  if (error) {
    console.error("[shop] listPublicShopCuaHang san_pham catalog", error);
    return out;
  }

  for (const row of data ?? []) {
    const ten = row.ten?.trim();
    if (!ten) continue;
    const list = out.get(row.id_nguoi_dung) ?? [];
    if (list.length >= CATALOG_MAU_PER_OWNER) continue;
    list.push({
      id: row.id,
      ten,
      anhUrl: shopImageUrl(row.anh_id),
      idNhom: row.id_nhom?.trim() || null,
    });
    out.set(row.id_nguoi_dung, list);
  }

  return out;
}

function buildSearchHaystack(parts: Array<string | null | undefined>): string {
  return parts
    .flatMap((p) => (p ? [p] : []))
    .join(" ")
    .toLocaleLowerCase("vi");
}

function filterNhomWithMau(
  nhom: NhomCatalogByOwner | undefined,
  mau: PublicShopListingHang[],
): NhomCatalogByOwner {
  const empty: NhomCatalogByOwner = { previewHang: [], catalogHang: [] };
  if (!nhom) return empty;
  const nhomIdsWithMau = new Set(
    mau.map((m) => m.idNhom?.trim()).filter((id): id is string => Boolean(id)),
  );
  /** Chỉ loại có ≥1 mẫu đang bán — khớp storefront (build từ san_pham). */
  const catalogHang = nhom.catalogHang.filter((h) => nhomIdsWithMau.has(h.id));
  const allowed = new Set(catalogHang.map((h) => h.id));
  const previewHang = nhom.previewHang.filter((h) => allowed.has(h.id));
  /* Nếu preview hết (Feature trống) nhưng vẫn còn loại có mẫu → lấy từ catalog. */
  const preview =
    previewHang.length > 0
      ? previewHang
      : catalogHang.slice(0, FEATURED_HANG_PER_CARD);
  return { previewHang: preview, catalogHang };
}

/** Gắn giá loại lên mẫu (khi chưa có bảng giá chi tiết trên hub). */
function attachMauGiaFromNhom(
  mau: PublicShopListingHang[],
  catalogHang: PublicShopListingHang[],
): PublicShopListingHang[] {
  if (mau.length === 0) return mau;
  const giaByNhom = new Map(
    catalogHang.map((h) => [
      h.id,
      { gia: h.giaHienThi ?? null, tienTe: h.tienTe ?? "VND" },
    ]),
  );
  return mau.map((m) => {
    if (m.giaHienThi != null) return m;
    const fromNhom = m.idNhom ? giaByNhom.get(m.idNhom) : null;
    if (!fromNhom) return m;
    return {
      ...m,
      giaHienThi: fromNhom.gia,
      tienTe: fromNhom.tienTe,
    };
  });
}

/**
 * Hub `/cua-hang`: shop công khai (`ban_hang_bat` + `shop_hien_thi`),
 * chưa soft-delete. Sort: đang mở → có hàng → đủ thông tin mặt tiền → tên;
 * shop không hàng xếp sau (vẫn hiện).
 */
export async function listPublicShopCuaHang(): Promise<PublicShopListingItem[]> {
  const admin = createServiceRoleClient();
  const nowMs = Date.now();

  const { data: owners, error: ownerErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .eq("ban_hang_bat", true)
    .eq("shop_hien_thi", true)
    .not("slug", "is", null)
    .returns<OwnerRow[]>();

  if (ownerErr) {
    console.error("[shop] listPublicShopCuaHang owners", ownerErr);
    throw new Error("LIST_FAILED");
  }

  const ownerRows = (owners ?? []).filter((o) => Boolean(o.slug?.trim()));
  if (ownerRows.length === 0) return [];

  const ownerById = new Map(ownerRows.map((o) => [o.id, o]));
  const ownerIds = ownerRows.map((o) => o.id);

  const { data: shops, error: shopErr } = await admin
    .from("shop_cua_hang")
    .select(
      "id, id_nguoi_dung, ten, mo_ta, avatar_id, cover_id, tam_dong, tam_dong_tu, tam_dong_den, tam_dong_ly_do, tao_luc",
    )
    .eq("da_xoa", false)
    .in("id_nguoi_dung", ownerIds)
    .order("tao_luc", { ascending: false })
    .limit(LIST_LIMIT)
    .returns<ShopRow[]>();

  if (shopErr) {
    console.error("[shop] listPublicShopCuaHang", shopErr);
    throw new Error("LIST_FAILED");
  }

  const shopRows = shops ?? [];
  const shopOwnerIds = [...new Set(shopRows.map((r) => r.id_nguoi_dung))];
  const [ownersWithHang, nhomByOwnerRaw, mauByOwner] = await Promise.all([
    ownersWithHangBan(admin, shopOwnerIds),
    nhomCatalogByOwner(admin, shopOwnerIds),
    sanPhamCatalogByOwner(admin, shopOwnerIds),
  ]);

  const items: ListingDraft[] = [];
  for (const row of shopRows) {
    const owner = ownerById.get(row.id_nguoi_dung);
    const ownerSlug = owner?.slug?.trim();
    if (!owner || !ownerSlug) continue;

    const ten = (row.ten?.trim() || owner.ten_hien_thi?.trim() || ownerSlug).trim();
    const shopSlug = shopSlugFromTen(row.ten, ownerSlug);
    const dangTamDong = isShopTamDongActive(
      {
        tamDong: row.tam_dong === true,
        tamDongTu: row.tam_dong_tu,
        tamDongDen: row.tam_dong_den,
        tamDongLyDo: row.tam_dong_ly_do,
      },
      nowMs,
    );

    const moTa = row.mo_ta?.trim() || null;
    const avatarUrl = shopImageUrl(row.avatar_id);
    const coverUrl = shopImageUrl(row.cover_id);
    const catalogMauRaw = mauByOwner.get(row.id_nguoi_dung) ?? [];
    const nhomCat = filterNhomWithMau(
      nhomByOwnerRaw.get(row.id_nguoi_dung),
      catalogMauRaw,
    );
    const catalogHang = nhomCat.catalogHang;
    const catalogMau = attachMauGiaFromNhom(catalogMauRaw, catalogHang);
    const ownerTen = owner.ten_hien_thi?.trim() || null;
    const featuredHang = nhomCat.previewHang;
    /** Chỉ đếm mẫu đang bán — loại trống không tính «có hàng». */
    const hasHang =
      ownersWithHang.has(row.id_nguoi_dung) || catalogMau.length > 0;

    items.push({
      id: row.id,
      ten,
      moTa,
      href: shopPublicHref(ownerSlug, shopSlug),
      shopSlug,
      avatarUrl,
      coverUrl,
      ownerSlug,
      ownerTen,
      dangTamDong,
      tamDongLyDo: dangTamDong ? row.tam_dong_ly_do?.trim() || null : null,
      featuredHang,
      catalogHang,
      catalogMau,
      searchHaystack: buildSearchHaystack([
        ten,
        moTa,
        ownerTen,
        ownerSlug,
        shopSlug,
        ...catalogHang.map((h) => h.ten),
        ...catalogMau.map((m) => m.ten),
      ]),
      hasHang,
      completeness: shopListingCompleteness({
        avatarUrl,
        coverUrl,
        moTa,
      }),
    });
  }

  items.sort((a, b) => {
    if (a.dangTamDong !== b.dangTamDong) {
      return a.dangTamDong ? 1 : -1;
    }
    if (a.hasHang !== b.hasHang) {
      return a.hasHang ? -1 : 1;
    }
    if (a.completeness !== b.completeness) {
      return b.completeness - a.completeness;
    }
    return a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" });
  });

  return items.map(({ completeness: _c, hasHang: _h, ...item }) => item);
}
