import type { WorldBoostLoai } from "@/lib/cins/world-boost-client";
import type { GalleryMediaKind } from "@/lib/journey/post-block-helpers";

export type WorldBoostCatalogNguon = "user" | "org";

/** Định dạng media — lọc catalog admin (không trùng nguồn user/org). */
export type WorldBoostDinhDangFilter = "all" | GalleryMediaKind;

/** Xác thực org trên cột mốc user (`verify_xac_nhan`). */
export type WorldBoostXacThucFilter = "all" | "verified" | "unverified";

export type WorldBoostCatalogItem = {
  loai: WorldBoostLoai;
  id: string;
  key: string;
  tieuDe: string;
  moTa: string | null;
  thumbUrl: string | null;
  nguon: WorldBoostCatalogNguon;
  loaiLabel: string;
  /** Định dạng nội dung suy từ blocks (ảnh / video / bài viết / nhúng). */
  dinhDang: GalleryMediaKind;
  dinhDangLabel: string;
  /** Cột mốc user đã được tổ chức xác thực. */
  daXacThuc: boolean;
  tacGiaTen: string | null;
  tacGiaSlug: string | null;
  taoLuc: string;
  dangBoost: boolean;
  hetHanLuc: string | null;
};

export type WorldBoostStats = {
  dangBoost: number;
  sapHetHan24h: number;
  cotMocMoi7n: number;
  orgBaiDangMoi7n: number;
  suKienMoi7n: number;
};

export type WorldBoostGrowthDays = 7 | 30;

export type WorldBoostGrowthPoint = {
  date: string; // YYYY-MM-DD (Asia/Ho_Chi_Minh)
  cotMoc: number;
  orgBaiDang: number;
  suKien: number;
  total: number;
};

export type WorldBoostGrowthTotals = {
  cotMoc: number;
  orgBaiDang: number;
  suKien: number;
  total: number;
};

export type WorldBoostGrowth = {
  days: WorldBoostGrowthDays;
  series: WorldBoostGrowthPoint[];
  totals: WorldBoostGrowthTotals;
  prevTotals: WorldBoostGrowthTotals;
};
