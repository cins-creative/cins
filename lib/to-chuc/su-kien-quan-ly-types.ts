import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-dang-ky";

export type SuKienQuanLyStats = {
  soSeThamGia: number;
  soQuanTam: number;
  soChoDuyetNoiDung: number;
  soDaDuyetNoiDung: number;
  slotToiDa: number | null;
};

export type SuKienQuanLyThanhVien = {
  id: string;
  ten: string | null;
  slug: string | null;
  loai: LoaiPhanHoiSuKien;
  taoLuc: string;
};

export type SuKienQuanLyPayload = {
  stats: SuKienQuanLyStats;
  thanhVien: SuKienQuanLyThanhVien[];
};

/** Sự kiện đang / sắp diễn ra trong bảng quản lý org. */
export type SuKienQuanLyOrgItem = {
  id: string;
  ten: string;
  batDau: string;
  ketThuc: string | null;
  coverSrc: string | null;
  status: "active" | "upcoming";
  soSeThamGia: number;
  soChoDuyetNoiDung: number;
};

export type SuKienQuanLyOrgPayload = {
  suKien: SuKienQuanLyOrgItem[];
  tongChoDuyet: number;
};
