export type AdminToChucLoaiFilter =
  | "all"
  | "truong_dai_hoc"
  | "co_so_dao_tao"
  | "cong_dong"
  | "studio";

export type AdminToChucNguoiTao = {
  id: string;
  ten: string;
  slug: string | null;
};

export type AdminToChucListRow = {
  id: string;
  ten: string;
  slug: string;
  loai: Exclude<AdminToChucLoaiFilter, "all">;
  loaiLabel: string;
  tinhThanh: string;
  tinCay: string;
  avatarUrl: string | null;
  journey: string;
  nguoiTao: AdminToChucNguoiTao | null;
  showVerify?: boolean;
};

export type AdminToChucListStats = {
  total: number;
  pendingVerify: number;
  verified: number;
  truong: number;
  coSo: number;
  congDong: number;
  studio: number;
};

export type AdminToChucListResponse = {
  rows: AdminToChucListRow[];
  stats: AdminToChucListStats;
};

export type AdminToChucListParams = {
  loai: AdminToChucLoaiFilter;
  q: string;
};

export type AdminToChucDetail = {
  id: string;
  ten: string;
  slug: string;
  loai: Exclude<AdminToChucLoaiFilter, "all">;
  loaiLabel: string;
  moTa: string | null;
  tinhThanh: string | null;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
  trangThaiTinCay: string;
  trangThaiHoatDong: string;
};

export type AdminToChucUpdateInput = {
  ten?: string;
  slug?: string;
  moTa?: string | null;
  tinhThanh?: string | null;
  diaChi?: string | null;
  dienThoai?: string | null;
  emailLienHe?: string | null;
  trangThaiTinCay?: string;
  trangThaiHoatDong?: string;
};

export const ADMIN_TO_CHUC_TIN_CAY_OPTIONS = [
  { value: "binh_thuong", label: "Bình thường" },
  { value: "dang_review", label: "Đang review" },
  { value: "bi_canh_bao", label: "Cảnh báo" },
  { value: "bi_cam", label: "Bị cấm" },
  { value: "verified_official", label: "✓ Verified" },
] as const;

export const ADMIN_TO_CHUC_HOAT_DONG_OPTIONS = [
  { value: "dang_hoat_dong", label: "Đang hoạt động" },
  { value: "tam_ngung", label: "Tạm ngưng" },
  { value: "da_dong_cua", label: "Đã đóng cửa" },
] as const;

export function parseAdminToChucListParams(
  searchParams: URLSearchParams,
): AdminToChucListParams {
  const loaiRaw = searchParams.get("loai") ?? "all";
  const loai: AdminToChucLoaiFilter =
    loaiRaw === "truong_dai_hoc" ||
    loaiRaw === "co_so_dao_tao" ||
    loaiRaw === "cong_dong" ||
    loaiRaw === "studio"
      ? loaiRaw
      : "all";
  return {
    loai,
    q: (searchParams.get("q") ?? "").trim(),
  };
}
