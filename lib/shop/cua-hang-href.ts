import { manageSellerHref } from "@/lib/cins/manage-site";

const MAX_SHOP_SLUG_LEN = 64;

/** Segment loại hàng trên storefront (canonical). */
export const SHOP_COLLECTION_SEGMENT = "collections";
/** Segment cũ — middleware 308 sang `collections`. */
export const SHOP_COLLECTION_SEGMENT_LEGACY = "loai";

/** Segment route bị reserve — không dùng làm shopSlug. */
export const SHOP_SLUG_RESERVED = new Set([
  SHOP_COLLECTION_SEGMENT,
  SHOP_COLLECTION_SEGMENT_LEGACY,
]);

export function isShopCollectionPathSegment(seg: string): boolean {
  return (
    seg === SHOP_COLLECTION_SEGMENT || seg === SHOP_COLLECTION_SEGMENT_LEGACY
  );
}

/** Slugify tên cửa hàng (cùng kiểu org: NFD, đ→d, [a-z0-9-]). */
export function slugifyShopName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SHOP_SLUG_LEN);
}

/**
 * Segment URL storefront từ tên shop.
 * Tên trống / slugify rỗng / trùng reserve → fallback ownerSlug.
 */
export function shopSlugFromTen(
  ten: string | null | undefined,
  ownerSlug: string,
): string {
  const fallback = ownerSlug.trim().toLowerCase() || "shop";
  const fromTen = slugifyShopName(ten?.trim() || "");
  if (!fromTen || SHOP_SLUG_RESERVED.has(fromTen)) return fallback;
  return fromTen;
}

/** Canonical storefront — `/{ownerSlug}/shop/{shopSlug}`. */
export function shopPublicHref(ownerSlug: string, shopSlug: string): string {
  return `/${encodeURIComponent(ownerSlug.trim())}/shop/${encodeURIComponent(shopSlug.trim())}`;
}

/** Entry cũ / tab Shop — `/{ownerSlug}/shop` (server redirect → canonical). */
export function shopEntryHref(ownerSlug: string): string {
  return `/${encodeURIComponent(ownerSlug.trim())}/shop`;
}

/** Trang loại hàng — `/{slug}/shop/{shopSlug}/collections/{nhomId}`. */
export function shopLoaiHref(
  ownerSlug: string,
  shopSlug: string,
  nhomId: string,
): string {
  return `${shopPublicHref(ownerSlug, shopSlug)}/${SHOP_COLLECTION_SEGMENT}/${encodeURIComponent(nhomId.trim())}`;
}

/** Trang loại + chọn sẵn mẫu (`?variant=` = sanPhamId). */
export function shopLoaiMauHref(
  ownerSlug: string,
  shopSlug: string,
  nhomId: string,
  sanPhamId: string,
): string {
  const base = shopLoaiHref(ownerSlug, shopSlug, nhomId);
  const id = sanPhamId.trim();
  if (!id) return base;
  return `${base}?variant=${encodeURIComponent(id)}`;
}

/** Owner setup / quản lý cửa hàng. */
export function shopSetupHref(_slug?: string): string {
  return manageSellerHref("/seller/store");
}

/** Hub quản lý kho — `/seller/inventory`. */
export function shopKhoHubHref(): string {
  return manageSellerHref("/seller/inventory");
}

/** Segment URL cho loại chưa gán trên Kho. */
export const SHOP_KHO_ORPHAN_SLUG = "khac";

/** Segment path loại hàng trên Kho — slugify tên; trùng tên → thêm 8 ký tự id. */
export function shopKhoLoaiPathSegment(
  nhom: { id: string; nhan: string },
  siblings: ReadonlyArray<{ id: string; nhan: string }> = [],
): string {
  const id = nhom.id.trim();
  const base = slugifyShopName(nhom.nhan) || "loai";
  const sameBase = siblings.filter(
    (s) => (slugifyShopName(s.nhan) || "loai") === base,
  );
  if (sameBase.length <= 1) return base;
  return `${base}-${id.slice(0, 8)}`;
}

/** Chi tiết loại trên Kho — `/seller/inventory/{segment}`. */
export function shopKhoLoaiHref(
  nhom: { id: string; nhan: string },
  siblings: ReadonlyArray<{ id: string; nhan: string }> = [],
): string {
  return `${shopKhoHubHref()}/${encodeURIComponent(
    shopKhoLoaiPathSegment(nhom, siblings),
  )}`;
}

export function shopKhoOrphanHref(): string {
  return `${shopKhoHubHref()}/${SHOP_KHO_ORPHAN_SLUG}`;
}

/**
 * Resolve segment URL Kho → `nhom.id` hoặc `SHOP_KHO_ORPHAN_SLUG`.
 * Chấp nhận UUID đầy đủ (link cũ / storefront-style).
 */
export function resolveShopKhoLoaiSlug(
  slug: string,
  nhoms: ReadonlyArray<{ id: string; nhan: string }>,
): string | null {
  const raw = slug.trim();
  if (!raw) return null;
  if (raw === SHOP_KHO_ORPHAN_SLUG) return SHOP_KHO_ORPHAN_SLUG;
  if (nhoms.some((n) => n.id === raw)) return raw;
  for (const n of nhoms) {
    if (shopKhoLoaiPathSegment(n, nhoms) === raw) return n.id;
  }
  const baseMatches = nhoms.filter(
    (n) => (slugifyShopName(n.nhan) || "loai") === raw,
  );
  if (baseMatches.length === 1) return baseMatches[0]!.id;
  return null;
}
