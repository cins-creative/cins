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
