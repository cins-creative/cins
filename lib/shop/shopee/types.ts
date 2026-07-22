/** Payload chuẩn hoá sau khi đọc Shopee — map sang shop_nhom / shop_san_pham. */

export type ShopeeParsedIds = {
  shopId: string;
  itemId: string;
  sourceUrl: string;
};

export type ShopeeMauDraft = {
  /** Tên mẫu / biến thể (vd. Bento, Furina). */
  ten: string;
  /** URL ảnh gốc Shopee (nếu có). */
  imageUrl: string | null;
};

export type ShopeeProductDraft = {
  shopId: string;
  itemId: string;
  sourceUrl: string;
  /** Tiêu đề gốc Shopee. */
  title: string;
  /** Mô tả chi tiết (có thể dài). */
  description: string;
  /** Giá thấp nhất (VND), null nếu crawler không lấy được. */
  priceMin: number | null;
  /** Ảnh gallery (URL CDN Shopee), đã bỏ video; [0] = thumbnail loại. */
  imageUrls: string[];
  /** Danh sách mẫu / model. */
  models: ShopeeMauDraft[];
  /** Nguồn dữ liệu: og | api | raw. */
  source: "og" | "api" | "raw";
  warnings: string[];
};

export type ShopeeImportedImage = {
  sourceUrl: string;
  imageId: string;
  url: string;
};

export type ShopeeImportPreview = {
  draft: ShopeeProductDraft;
  /** Tên loại đã rút ≤ 40. */
  nhan: string;
  /** Mô tả đã rút ≤ 280. */
  moTa: string;
  giaMacDinh: number | null;
  images: ShopeeImportedImage[];
  models: Array<{ ten: string; anhId: string | null; anhUrl: string | null }>;
};
