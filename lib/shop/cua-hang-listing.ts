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
import { mapDanhMucSlugByIds } from "@/lib/shop/danh-muc";
import { fandomSlugsByNhomIds } from "@/lib/shop/fandom";
import { facetsByNhomIds } from "@/lib/shop/thuoc-tinh";
import { SHOP_DON_TINH_DA_BAN, type ShopLoaiGiam } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const IN_CHUNK = 120;

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
  mo_ta: string | null;
  anh_id: string | null;
  noi_bat: boolean;
  thu_tu: number;
  gia_mac_dinh: number | string | null;
  id_danh_muc: string | null;
};

type NhomCatalogByOwner = {
  /** Toàn bộ loại — Feature trước, rồi thường (có ảnh ưu tiên trong từng nhóm). */
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
    anhUrl: shopImageUrl(r.anh_id, "thumbnail"),
    moTa: r.mo_ta?.trim() || null,
    giaHienThi: parseGiaMacDinh(r.gia_mac_dinh),
    tienTe: "VND",
    noiBat: r.noi_bat === true,
    soLuongBan: 0,
    hetHang: true,
    danhMucSlug: null,
    facets: {},
  };
}

function sortNhomForPreview(a: NhomCatalogRow, b: NhomCatalogRow): number {
  const aImg = a.anh_id?.trim() ? 1 : 0;
  const bImg = b.anh_id?.trim() ? 1 : 0;
  if (aImg !== bImg) return bImg - aImg;
  return a.thu_tu - b.thu_tu;
}

/**
 * Catalog loại (truc=1), sắp Feature → thường — dùng cho card + search.
 * `enrichTaxonomy: false` (tab Shop) bỏ facet/danh mục — chỉ cần preview card.
 */
async function nhomCatalogByOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
  opts?: { enrichTaxonomy?: boolean },
): Promise<Map<string, NhomCatalogByOwner>> {
  const out = new Map<string, NhomCatalogByOwner>();
  if (ownerIds.length === 0) return out;
  const enrichTaxonomy = opts?.enrichTaxonomy !== false;

  const { data, error } = await admin
    .from("shop_nhom")
    .select(
      "id, id_nguoi_dung, nhan, mo_ta, anh_id, noi_bat, thu_tu, gia_mac_dinh, id_danh_muc",
    )
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
    const starred = rows
      .filter((r) => r.noi_bat === true)
      .sort(sortNhomForPreview);
    const regular = rows
      .filter((r) => r.noi_bat !== true)
      .sort(sortNhomForPreview);
    const ordered = [...starred, ...regular];
    out.set(ownerId, {
      catalogHang: ordered.map(mapNhomToHang),
    });
  }

  if (!enrichTaxonomy) return out;

  /* Enrich danh mục + facet sau khi gom đủ id. */
  const allHang = [...out.values()].flatMap((v) => v.catalogHang);
  const nhomIds = allHang.map((h) => h.id);
  const danhMucIds = [...buckets.values()]
    .flat()
    .map((r) => r.id_danh_muc?.trim())
    .filter((id): id is string => Boolean(id));
  const danhMucIdByNhom = new Map<string, string>();
  for (const rows of buckets.values()) {
    for (const r of rows) {
      if (r.id_danh_muc?.trim()) {
        danhMucIdByNhom.set(r.id, r.id_danh_muc.trim());
      }
    }
  }

  const [slugByDm, facetsMap, fandomSlugMap] = await Promise.all([
    mapDanhMucSlugByIds(danhMucIds),
    facetsByNhomIds(nhomIds),
    fandomSlugsByNhomIds(nhomIds),
  ]);

  for (const { catalogHang } of out.values()) {
    for (const h of catalogHang) {
      const dmId = danhMucIdByNhom.get(h.id);
      h.danhMucSlug = dmId ? (slugByDm.get(dmId) ?? null) : null;
      const facets = { ...(facetsMap.get(h.id) ?? {}) };
      delete facets.fandom;
      const fandomSlugs = fandomSlugMap.get(h.id) ?? [];
      if (fandomSlugs.length > 0) facets.fandom = fandomSlugs;
      h.facets = facets;
    }
  }

  return out;
}

/**
 * Loại có ≥1 mẫu đang bán — phân trang theo `id_nhom` (không cắt sớm như catalog mẫu).
 */
async function nhomIdsWithHangBanByOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (ownerIds.length === 0) return out;

  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("shop_san_pham")
      .select("id_nguoi_dung, id_nhom")
      .in("id_nguoi_dung", ownerIds)
      .eq("da_xoa", false)
      .eq("dang_ban", true)
      .not("id_nhom", "is", null)
      .range(from, from + pageSize - 1)
      .returns<Array<{ id_nguoi_dung: string; id_nhom: string | null }>>();

    if (error) {
      console.error("[shop] listPublicShopCuaHang nhom-with-hang", error);
      break;
    }
    if (!data?.length) break;

    for (const row of data) {
      const nhomId = row.id_nhom?.trim();
      if (!nhomId) continue;
      const set = out.get(row.id_nguoi_dung) ?? new Set<string>();
      set.add(nhomId);
      out.set(row.id_nguoi_dung, set);
    }

    if (data.length < pageSize) break;
    from += pageSize;
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
      anhUrl: shopImageUrl(row.anh_id, "thumbnail"),
      idNhom: row.id_nhom?.trim() || null,
    });
    out.set(row.id_nguoi_dung, list);
  }

  return out;
}

type NhomListingStats = {
  soLuongBan: number;
  anyInStock: boolean;
};

/**
 * Aggregate tồn + đã bán theo loại (`shop_nhom`) — cùng nguồn storefront
 * (`shop_bien_the.so_luong_ton` · `shop_don_hang_dong` đơn hoàn thành).
 */
async function nhomListingStats(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
): Promise<Map<string, NhomListingStats>> {
  const out = new Map<string, NhomListingStats>();
  if (ownerIds.length === 0) return out;

  type SpLink = { id: string; id_nhom: string | null };
  const sps: SpLink[] = [];
  {
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await admin
        .from("shop_san_pham")
        .select("id, id_nhom")
        .in("id_nguoi_dung", ownerIds)
        .eq("da_xoa", false)
        .eq("dang_ban", true)
        .not("id_nhom", "is", null)
        .range(from, from + pageSize - 1)
        .returns<SpLink[]>();
      if (error) {
        console.error("[shop] listPublicShopCuaHang nhom stats sp", error);
        break;
      }
      if (!data?.length) break;
      sps.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  if (sps.length === 0) return out;

  const nhomBySp = new Map<string, string>();
  for (const sp of sps) {
    const nhomId = sp.id_nhom?.trim();
    if (!nhomId) continue;
    nhomBySp.set(sp.id, nhomId);
    if (!out.has(nhomId)) {
      out.set(nhomId, { soLuongBan: 0, anyInStock: false });
    }
  }

  const spIds = [...nhomBySp.keys()];
  type BtRow = {
    id: string;
    id_san_pham: string;
    so_luong_ton: number | null;
  };
  const btToNhom = new Map<string, string>();
  for (let i = 0; i < spIds.length; i += IN_CHUNK) {
    const chunk = spIds.slice(i, i + IN_CHUNK);
    const { data, error } = await admin
      .from("shop_bien_the")
      .select("id, id_san_pham, so_luong_ton")
      .in("id_san_pham", chunk)
      .eq("da_xoa", false)
      .returns<BtRow[]>();
    if (error) {
      console.error("[shop] listPublicShopCuaHang nhom stats bt", error);
      break;
    }
    for (const bt of data ?? []) {
      const nhomId = nhomBySp.get(bt.id_san_pham);
      if (!nhomId) continue;
      btToNhom.set(bt.id, nhomId);
      const ton = Math.max(0, Math.trunc(Number(bt.so_luong_ton) || 0));
      if (ton <= 0) continue;
      const cur = out.get(nhomId);
      if (cur) cur.anyInStock = true;
    }
  }

  const btIds = [...btToNhom.keys()];
  type SoldRow = {
    id_bien_the: string | null;
    so_luong: number;
    shop_don_hang:
      | { trang_thai: string }
      | { trang_thai: string }[]
      | null;
  };
  for (let i = 0; i < btIds.length; i += IN_CHUNK) {
    const chunk = btIds.slice(i, i + IN_CHUNK);
    const { data, error } = await admin
      .from("shop_don_hang_dong")
      .select("id_bien_the, so_luong, shop_don_hang!inner(trang_thai)")
      .in("id_bien_the", chunk);
    if (error) {
      console.error("[shop] listPublicShopCuaHang nhom stats sold", error);
      break;
    }
    for (const row of (data ?? []) as SoldRow[]) {
      if (!row.id_bien_the) continue;
      const nhomId = btToNhom.get(row.id_bien_the);
      if (!nhomId) continue;
      const don = Array.isArray(row.shop_don_hang)
        ? row.shop_don_hang[0]
        : row.shop_don_hang;
      if (
        !don ||
        !(SHOP_DON_TINH_DA_BAN as readonly string[]).includes(don.trang_thai)
      ) {
        continue;
      }
      const qty = Math.max(0, Math.trunc(Number(row.so_luong) || 0));
      if (qty <= 0) continue;
      const cur = out.get(nhomId);
      if (cur) cur.soLuongBan += qty;
    }
  }

  return out;
}

function applyNhomStats(
  hang: PublicShopListingHang[],
  stats: Map<string, NhomListingStats>,
): PublicShopListingHang[] {
  if (hang.length === 0) return hang;
  return hang.map((h) => {
    const s = stats.get(h.id);
    return {
      ...h,
      soLuongBan: s?.soLuongBan ?? 0,
      hetHang: s ? !s.anyInStock : true,
    };
  });
}

function buildSearchHaystack(parts: Array<string | null | undefined>): string {
  return parts
    .flatMap((p) => (p ? [p] : []))
    .join(" ")
    .toLocaleLowerCase("vi");
}

function filterNhomWithMau(
  nhom: NhomCatalogByOwner | undefined,
  nhomIdsWithMau: Set<string> | undefined,
): { previewHang: PublicShopListingHang[]; catalogHang: PublicShopListingHang[] } {
  const empty = { previewHang: [] as PublicShopListingHang[], catalogHang: [] as PublicShopListingHang[] };
  if (!nhom || !nhomIdsWithMau?.size) return empty;
  /** Chỉ loại có ≥1 mẫu đang bán — khớp storefront. */
  const catalogHang = nhom.catalogHang.filter((h) => nhomIdsWithMau.has(h.id));
  /** Card: tối đa 3 — Feature trước (đã sort), thiếu thì loại thường. */
  const previewHang = catalogHang.slice(0, FEATURED_HANG_PER_CARD);
  return { previewHang, catalogHang };
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

type ComboOffer = {
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
};

type HubUuDaiFlags = {
  voucherOwners: Set<string>;
  voucherLinesByOwner: Map<string, string[]>;
  /** Owner có ≥1 combo đang chạy (discount tab Shop). */
  comboOwners: Set<string>;
  comboNhomIds: Set<string>;
  comboSanPhamIds: Set<string>;
  comboByNhom: Map<string, ComboOffer>;
  comboBySanPham: Map<string, ComboOffer>;
};

function formatVndCompact(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })}tr`;
  }
  if (n >= 1000) {
    return `${Math.round(n / 1000).toLocaleString("vi-VN")}k`;
  }
  return n.toLocaleString("vi-VN");
}

function formatVoucherTickerLine(
  loaiGiam: ShopLoaiGiam,
  giaTri: number,
  donToiThieu: number,
): string {
  const minPart =
    donToiThieu > 0 ? ` từ ${formatVndCompact(donToiThieu)}` : "";
  if (loaiGiam === "phan_tram") {
    return `Voucher giảm giá ${giaTri}%${minPart}`;
  }
  return `Voucher giảm giá ${formatVndCompact(giaTri)}${minPart}`;
}

const VOUCHER_TICKER_MAX = 12;

function isBetterComboOffer(next: ComboOffer, prev: ComboOffer): boolean {
  if (next.loaiGiam === "phan_tram" && prev.loaiGiam !== "phan_tram") return true;
  if (prev.loaiGiam === "phan_tram" && next.loaiGiam !== "phan_tram") return false;
  return next.giaTri > prev.giaTri;
}

function rememberComboOffer(
  map: Map<string, ComboOffer>,
  key: string,
  offer: ComboOffer,
): void {
  const prev = map.get(key);
  if (!prev || isBetterComboOffer(offer, prev)) map.set(key, offer);
}

function formatComboListingTag(offer: ComboOffer): string {
  if (offer.loaiGiam === "phan_tram") {
    return `combo -${offer.giaTri}%`;
  }
  const n = offer.giaTri;
  if (n >= 1_000_000) {
    return `combo -${(n / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })}tr`;
  }
  if (n >= 1000) {
    return `combo -${Math.round(n / 1000).toLocaleString("vi-VN")}k`;
  }
  return `combo -${n.toLocaleString("vi-VN")}`;
}

function resolveComboOffer(
  hang: { id: string; idNhom?: string | null },
  kind: "loai" | "mau",
  flags: HubUuDaiFlags,
): ComboOffer | null {
  if (kind === "loai") return flags.comboByNhom.get(hang.id) ?? null;
  return (
    flags.comboBySanPham.get(hang.id) ??
    (hang.idNhom?.trim()
      ? (flags.comboByNhom.get(hang.idNhom.trim()) ?? null)
      : null)
  );
}

/** Voucher công khai + điều kiện combo đang chạy — badge hub `/cua-hang`. */
async function hubUuDaiFlagsByOwner(
  admin: ReturnType<typeof createServiceRoleClient>,
  ownerIds: string[],
  opts?: { includeVouchers?: boolean; includeCombos?: boolean },
): Promise<HubUuDaiFlags> {
  const voucherOwners = new Set<string>();
  const voucherLinesByOwner = new Map<string, string[]>();
  const comboOwners = new Set<string>();
  const comboNhomIds = new Set<string>();
  const comboSanPhamIds = new Set<string>();
  const comboByNhom = new Map<string, ComboOffer>();
  const comboBySanPham = new Map<string, ComboOffer>();
  const includeVouchers = opts?.includeVouchers !== false;
  const includeCombos = opts?.includeCombos !== false;
  if (ownerIds.length === 0) {
    return {
      voucherOwners,
      voucherLinesByOwner,
      comboOwners,
      comboNhomIds,
      comboSanPhamIds,
      comboByNhom,
      comboBySanPham,
    };
  }

  const nowIso = new Date().toISOString();

  if (includeVouchers) {
    const { data: voucherRows, error: voucherErr } = await admin
      .from("shop_voucher")
      .select(
        "id_nguoi_dung, loai_giam, gia_tri, don_toi_thieu, so_luong_tong, so_luong_da_dung",
      )
      .in("id_nguoi_dung", ownerIds)
      .eq("da_xoa", false)
      .eq("kich_hoat", true)
      .eq("cong_khai", true)
      .or(`bat_dau.is.null,bat_dau.lte.${nowIso}`)
      .or(`ket_thuc.is.null,ket_thuc.gt.${nowIso}`);

    if (voucherErr) {
      console.error("[shop] hubUuDaiFlags voucher", voucherErr);
    } else {
      type VoucherDraft = {
        loaiGiam: ShopLoaiGiam;
        giaTri: number;
        donToiThieu: number;
      };
      const vouchersByOwner = new Map<string, VoucherDraft[]>();

      for (const row of voucherRows ?? []) {
        const tong = row.so_luong_tong as number | null;
        const daDung = Number(row.so_luong_da_dung ?? 0);
        if (tong != null && daDung >= tong) continue;

        const loaiGiam = row.loai_giam as ShopLoaiGiam;
        const giaTri = Number(row.gia_tri);
        if (!Number.isFinite(giaTri) || giaTri <= 0) continue;

        const donRaw = Number(row.don_toi_thieu ?? 0);
        const donToiThieu = Number.isFinite(donRaw) && donRaw > 0 ? donRaw : 0;
        const ownerId = String(row.id_nguoi_dung);
        voucherOwners.add(ownerId);

        const list = vouchersByOwner.get(ownerId) ?? [];
        list.push({ loaiGiam, giaTri, donToiThieu });
        vouchersByOwner.set(ownerId, list);
      }

      for (const [ownerId, list] of vouchersByOwner) {
        list.sort(
          (a, b) =>
            a.donToiThieu - b.donToiThieu ||
            a.giaTri - b.giaTri,
        );
        voucherLinesByOwner.set(
          ownerId,
          list
            .slice(0, VOUCHER_TICKER_MAX)
            .map((v) =>
              formatVoucherTickerLine(v.loaiGiam, v.giaTri, v.donToiThieu),
            ),
        );
      }
    }
  }

  if (!includeCombos) {
    return {
      voucherOwners,
      voucherLinesByOwner,
      comboOwners,
      comboNhomIds,
      comboSanPhamIds,
      comboByNhom,
      comboBySanPham,
    };
  }

  const { data: comboRows, error: comboErr } = await admin
    .from("shop_combo")
    .select("id, id_nguoi_dung, bat_dau, ket_thuc, loai_giam, gia_tri")
    .in("id_nguoi_dung", ownerIds)
    .eq("da_xoa", false)
    .eq("kich_hoat", true);

  if (comboErr) {
    console.error("[shop] hubUuDaiFlags combo", comboErr);
    return {
      voucherOwners,
      voucherLinesByOwner,
      comboOwners,
      comboNhomIds,
      comboSanPhamIds,
      comboByNhom,
      comboBySanPham,
    };
  }

  const now = Date.now();
  const comboOfferById = new Map<string, ComboOffer>();
  for (const row of comboRows ?? []) {
    const batDau = row.bat_dau as string | null;
    const ketThuc = row.ket_thuc as string | null;
    if (batDau && Date.parse(batDau) > now) continue;
    if (ketThuc && Date.parse(ketThuc) <= now) continue;
    const loaiGiam = row.loai_giam as ShopLoaiGiam;
    const giaTri = Number(row.gia_tri);
    if (!Number.isFinite(giaTri) || giaTri <= 0) continue;
    const comboId = String(row.id);
    comboOfferById.set(comboId, { loaiGiam, giaTri });
    comboOwners.add(String(row.id_nguoi_dung));
  }

  const activeComboIds = [...comboOfferById.keys()];

  for (let i = 0; i < activeComboIds.length; i += IN_CHUNK) {
    const chunk = activeComboIds.slice(i, i + IN_CHUNK);
    const { data: dkRows, error: dkErr } = await admin
      .from("shop_combo_dieu_kien")
      .select("id_combo, pham_vi, id_nhom, id_san_pham")
      .in("id_combo", chunk);

    if (dkErr) {
      console.error("[shop] hubUuDaiFlags combo dk", dkErr);
      continue;
    }

    for (const dk of dkRows ?? []) {
      const offer = comboOfferById.get(String(dk.id_combo));
      if (!offer) continue;
      const phamVi = String(dk.pham_vi);
      const idNhom = dk.id_nhom ? String(dk.id_nhom) : null;
      const idSanPham = dk.id_san_pham ? String(dk.id_san_pham) : null;
      if (phamVi === "loai_hang" && idNhom) {
        comboNhomIds.add(idNhom);
        rememberComboOffer(comboByNhom, idNhom, offer);
      }
      if (phamVi === "san_pham" && idSanPham) {
        comboSanPhamIds.add(idSanPham);
        rememberComboOffer(comboBySanPham, idSanPham, offer);
      }
    }
  }

  return {
    voucherOwners,
    voucherLinesByOwner,
    comboOwners,
    comboNhomIds,
    comboSanPhamIds,
    comboByNhom,
    comboBySanPham,
  };
}

function tagHangUuDai(
  hang: PublicShopListingHang,
  kind: "loai" | "mau",
  flags: HubUuDaiFlags,
): PublicShopListingHang {
  const offer = resolveComboOffer(hang, kind, flags);
  if (!offer) return hang;
  return {
    ...hang,
    coCombo: true,
    comboTag: formatComboListingTag(offer),
  };
}

/**
 * Hub `/cua-hang`: shop công khai (`ban_hang_bat` + `shop_hien_thi`),
 * chưa soft-delete. Sort: đang mở → có hàng → đủ thông tin mặt tiền → tên;
 * shop không hàng xếp sau (vẫn hiện).
 *
 * `mode`:
 * - `shop` — card nhẹ (preview 3 hàng + voucher); bỏ catalog/facet/stats mẫu.
 * - `hang` — catalog loại/mẫu + facet (bộ lọc); bỏ ticker voucher.
 */
export async function listPublicShopCuaHang(
  mode: "shop" | "hang" = "hang",
): Promise<PublicShopListingItem[]> {
  const admin = createServiceRoleClient();
  const nowMs = Date.now();
  const isShopMode = mode === "shop";

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

  const [
    ownersWithHang,
    nhomByOwnerRaw,
    nhomIdsWithHang,
    mauByOwner,
    nhomStats,
    uuDaiFlags,
  ] = await Promise.all([
    ownersWithHangBan(admin, shopOwnerIds),
    nhomCatalogByOwner(admin, shopOwnerIds, {
      enrichTaxonomy: !isShopMode,
    }),
    nhomIdsWithHangBanByOwner(admin, shopOwnerIds),
    isShopMode
      ? Promise.resolve(new Map<string, PublicShopListingHang[]>())
      : sanPhamCatalogByOwner(admin, shopOwnerIds),
    isShopMode
      ? Promise.resolve(new Map<string, NhomListingStats>())
      : nhomListingStats(admin, shopOwnerIds),
    hubUuDaiFlagsByOwner(admin, shopOwnerIds, {
      includeVouchers: isShopMode,
      includeCombos: true,
    }),
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
    const avatarUrl = shopImageUrl(row.avatar_id, "avatar");
    const coverUrl = isShopMode
      ? shopImageUrl(row.cover_id, "gridsm")
      : null;
    const catalogMauRaw = mauByOwner.get(row.id_nguoi_dung) ?? [];
    const nhomCat = filterNhomWithMau(
      nhomByOwnerRaw.get(row.id_nguoi_dung),
      nhomIdsWithHang.get(row.id_nguoi_dung),
    );

    const catalogHang = isShopMode
      ? []
      : applyNhomStats(nhomCat.catalogHang, nhomStats).map((h) =>
          tagHangUuDai(h, "loai", uuDaiFlags),
        );
    const featuredHang = isShopMode
      ? nhomCat.previewHang.map((h) => tagHangUuDai(h, "loai", uuDaiFlags))
      : [];
    const catalogMau = isShopMode
      ? []
      : attachMauGiaFromNhom(catalogMauRaw, catalogHang).map((m) =>
          tagHangUuDai(m, "mau", uuDaiFlags),
        );
    const ownerTen = owner.ten_hien_thi?.trim() || null;
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
      coVoucher: uuDaiFlags.voucherOwners.has(row.id_nguoi_dung),
      coCombo: uuDaiFlags.comboOwners.has(row.id_nguoi_dung),
      voucherTickerLines: isShopMode
        ? (uuDaiFlags.voucherLinesByOwner.get(row.id_nguoi_dung) ?? [])
        : [],
      searchHaystack: "",
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

/**
 * Card shop theo owner (quầy sự kiện) — không bắt `shop_hien_thi`.
 * Key map = `id_nguoi_dung`.
 */
export async function listShopListingCardsByOwnerIds(
  ownerIds: string[],
  opts?: {
    /**
     * false = chỉ meta shop (avatar/cover/tên) — dùng tab Quầy chế độ Shop.
     * true = kèm catalogHang/Mau (chế độ Mặt hàng / search hàng trên card).
     * @default true
     */
    includeCatalog?: boolean;
  },
): Promise<Map<string, PublicShopListingItem>> {
  const unique = [...new Set(ownerIds.filter(Boolean))];
  const out = new Map<string, PublicShopListingItem>();
  if (unique.length === 0) return out;
  const includeCatalog = opts?.includeCatalog !== false;

  const admin = createServiceRoleClient();
  const nowMs = Date.now();

  const { data: owners, error: ownerErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .in("id", unique)
    .returns<OwnerRow[]>();
  if (ownerErr) {
    console.error("[shop] listShopListingCardsByOwnerIds owners", ownerErr);
    return out;
  }

  const ownerById = new Map(
    (owners ?? [])
      .filter((o) => Boolean(o.slug?.trim()))
      .map((o) => [o.id, o]),
  );
  if (ownerById.size === 0) return out;

  const resolvedOwnerIds = [...ownerById.keys()];
  const { data: shops, error: shopErr } = await admin
    .from("shop_cua_hang")
    .select(
      "id, id_nguoi_dung, ten, mo_ta, avatar_id, cover_id, tam_dong, tam_dong_tu, tam_dong_den, tam_dong_ly_do, tao_luc",
    )
    .eq("da_xoa", false)
    .in("id_nguoi_dung", resolvedOwnerIds)
    .order("tao_luc", { ascending: false })
    .limit(Math.min(resolvedOwnerIds.length * 2, LIST_LIMIT))
    .returns<ShopRow[]>();
  if (shopErr) {
    console.error("[shop] listShopListingCardsByOwnerIds", shopErr);
    return out;
  }

  /** Một shop / owner — lấy bản ghi mới nhất. */
  const shopByOwner = new Map<string, ShopRow>();
  for (const row of shops ?? []) {
    if (!shopByOwner.has(row.id_nguoi_dung)) {
      shopByOwner.set(row.id_nguoi_dung, row);
    }
  }
  if (shopByOwner.size === 0) return out;

  const shopOwnerIds = [...shopByOwner.keys()];

  if (!includeCatalog) {
    for (const [ownerId, row] of shopByOwner) {
      const owner = ownerById.get(ownerId);
      const ownerSlug = owner?.slug?.trim();
      if (!owner || !ownerSlug) continue;
      const ten = (
        row.ten?.trim() ||
        owner.ten_hien_thi?.trim() ||
        ownerSlug
      ).trim();
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
      const ownerTen = owner.ten_hien_thi?.trim() || null;
      out.set(ownerId, {
        id: row.id,
        ten,
        moTa,
        href: shopPublicHref(ownerSlug, shopSlug),
        shopSlug,
        avatarUrl: shopImageUrl(row.avatar_id, "avatar"),
        coverUrl: shopImageUrl(row.cover_id, "gridsm"),
        ownerSlug,
        ownerTen,
        dangTamDong,
        tamDongLyDo: dangTamDong ? row.tam_dong_ly_do?.trim() || null : null,
        featuredHang: [],
        catalogHang: [],
        catalogMau: [],
        coVoucher: false,
        coCombo: false,
        voucherTickerLines: [],
        searchHaystack: buildSearchHaystack([ten, moTa, ownerTen, ownerSlug, shopSlug]),
      });
    }
    return out;
  }

  const [ownersWithHang, nhomByOwnerRaw, nhomIdsWithHang, mauByOwner, nhomStats, uuDaiFlags] =
    await Promise.all([
      ownersWithHangBan(admin, shopOwnerIds),
      nhomCatalogByOwner(admin, shopOwnerIds),
      nhomIdsWithHangBanByOwner(admin, shopOwnerIds),
      sanPhamCatalogByOwner(admin, shopOwnerIds),
      nhomListingStats(admin, shopOwnerIds),
      hubUuDaiFlagsByOwner(admin, shopOwnerIds),
    ]);

  for (const [ownerId, row] of shopByOwner) {
    const owner = ownerById.get(ownerId);
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
    const avatarUrl = shopImageUrl(row.avatar_id, "avatar");
    const coverUrl = shopImageUrl(row.cover_id, "gridsm");
    const catalogMauRaw = mauByOwner.get(ownerId) ?? [];
    const nhomCat = filterNhomWithMau(
      nhomByOwnerRaw.get(ownerId),
      nhomIdsWithHang.get(ownerId),
    );
    const catalogHang = applyNhomStats(nhomCat.catalogHang, nhomStats).map((h) =>
      tagHangUuDai(h, "loai", uuDaiFlags),
    );
    const featuredHang = applyNhomStats(nhomCat.previewHang, nhomStats).map((h) =>
      tagHangUuDai(h, "loai", uuDaiFlags),
    );
    const catalogMau = attachMauGiaFromNhom(catalogMauRaw, catalogHang).map((m) =>
      tagHangUuDai(m, "mau", uuDaiFlags),
    );
    const ownerTen = owner.ten_hien_thi?.trim() || null;
    void ownersWithHang;

    out.set(ownerId, {
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
      coVoucher: uuDaiFlags.voucherOwners.has(ownerId),
      coCombo: uuDaiFlags.comboOwners.has(ownerId),
      voucherTickerLines: uuDaiFlags.voucherLinesByOwner.get(ownerId) ?? [],
      searchHaystack: buildSearchHaystack([
        ten,
        moTa,
        ownerTen,
        ownerSlug,
        shopSlug,
        ...catalogHang.map((h) => h.ten),
        ...catalogHang.map((h) => h.moTa),
        ...catalogMau.map((m) => m.ten),
      ]),
    });
  }

  return out;
}
