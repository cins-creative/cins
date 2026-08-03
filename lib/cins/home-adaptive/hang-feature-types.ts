/** Client-safe — item «Hàng feature» (không server-only). */

export type HangFeatureItem = {
  sanPhamId: string;
  idNhom: string;
  tenSanPham: string;
  tenNhom: string | null;
  anhUrl: string | null;
  giaHienThi: number | null;
  shopTen: string | null;
  ownerName: string | null;
  ownerSlug: string;
  shopSlug: string;
  href: string;
  fromFriend: boolean;
};

export const HANG_FEATURE_SEEN_COOKIE = "cins-hang-feature-seen";
export const HANG_FEATURE_SEEN_MAX = 40;
