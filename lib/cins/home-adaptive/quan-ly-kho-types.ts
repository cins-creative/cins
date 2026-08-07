/** Client-safe — item «Quản lý kho hàng». */

export type QuanLyKhoItem = {
  bienTheId: string;
  sanPhamId: string;
  tenSanPham: string;
  nhan: string;
  soLuongTon: number;
  anhUrl: string | null;
  /** het | sap_het | ok */
  mucDo: "het" | "sap_het" | "ok";
};

/** Ngưỡng «sắp hết» — còn dưới N (1…N−1) coi là cần chú ý. */
export const QUAN_LY_KHO_SAP_HET = 5;

export type QuanLyKhoFilter = "ok" | "sap_het" | "het";

export const QUAN_LY_KHO_FILTERS: Array<{
  id: QuanLyKhoFilter;
  label: string;
}> = [
  { id: "ok", label: "Còn hàng" },
  { id: "sap_het", label: "Sắp hết" },
  { id: "het", label: "Hết hàng" },
];
