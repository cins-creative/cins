/** Constants form /mo-shop — dùng được ở client (không import server-only). */

export const SHOP_DANG_KY_MO_SUBMIT_LIMIT = 30;

export const SHOP_DANG_KY_MO_KENH = [
  "zalo",
  "messenger",
  "instagram",
  "discord",
  "email",
] as const;

export type ShopDangKyMoKenh = (typeof SHOP_DANG_KY_MO_KENH)[number];

export const SHOP_DANG_KY_MO_KENH_LABEL: Record<ShopDangKyMoKenh, string> = {
  zalo: "Zalo",
  messenger: "Messenger",
  instagram: "Instagram",
  discord: "Discord",
  email: "Email",
};

export const SHOP_DANG_KY_MO_HINH_THUC = [
  "co_san",
  "preorder",
  "ca_hai",
] as const;

export type ShopDangKyMoHinhThuc =
  (typeof SHOP_DANG_KY_MO_HINH_THUC)[number];

export const SHOP_DANG_KY_MO_LOAI_HANG = [
  "acrylic",
  "badge",
  "sticker",
  "print",
  "plush",
  "apparel",
  "khac",
] as const;

export type ShopDangKyMoLoaiHang =
  (typeof SHOP_DANG_KY_MO_LOAI_HANG)[number];

export const SHOP_DANG_KY_MO_LOAI_HANG_LABEL: Record<
  ShopDangKyMoLoaiHang,
  string
> = {
  acrylic: "Acrylic / standee",
  badge: "Badge / pin",
  sticker: "Sticker",
  print: "Print / poster",
  plush: "Plush / soft toy",
  apparel: "Áo / apparel",
  khac: "Khác",
};

export const SHOP_DANG_KY_MO_NEN_TANG = [
  "facebook",
  "instagram",
  "tiktok",
  "zalo",
  "shopee",
  "lazada",
  "discord",
  "threads",
  "carrd",
  "khac",
] as const;

export type ShopDangKyMoNenTang =
  (typeof SHOP_DANG_KY_MO_NEN_TANG)[number];

export const SHOP_DANG_KY_MO_NEN_TANG_LABEL: Record<
  ShopDangKyMoNenTang,
  string
> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  zalo: "Zalo",
  shopee: "Shopee",
  lazada: "Lazada",
  discord: "Discord",
  threads: "Threads",
  carrd: "Carrd / website",
  khac: "Khác",
};

export const SHOP_DANG_KY_MO_TRANG_THAI = [
  "moi",
  "dang_lien_he",
  "dang_dung",
  "cho_duyet",
  "da_public",
  "tu_choi",
  "tam_dung",
] as const;

export type ShopDangKyMoTrangThai =
  (typeof SHOP_DANG_KY_MO_TRANG_THAI)[number];

export const SHOP_DANG_KY_MO_TRANG_THAI_LABEL: Record<
  ShopDangKyMoTrangThai,
  string
> = {
  moi: "Mới",
  dang_lien_he: "Đang liên hệ",
  dang_dung: "Đang dựng",
  cho_duyet: "Chờ duyệt",
  da_public: "Đã public",
  tu_choi: "Từ chối",
  tam_dung: "Tạm dừng",
};

export const SHOP_DANG_KY_MO_HINH_THUC_LABEL: Record<
  ShopDangKyMoHinhThuc,
  string
> = {
  co_san: "Có sẵn",
  preorder: "Preorder",
  ca_hai: "Cả hai",
};
