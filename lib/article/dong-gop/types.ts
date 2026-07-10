import type { LoaiBaiViet } from "@/lib/articles/types";

/** Trạng thái bản đóng góp canonical — quy tắc 30, §K FOUNDATIONS. */
export type TrangThaiDongGop =
  | "nhap"
  | "cho_duyet"
  | "duoc_duyet"
  | "tu_choi"
  | "can_sua";

export const TRANG_THAI_DONG_GOP_LABEL: Record<TrangThaiDongGop, string> = {
  nhap: "Nháp",
  cho_duyet: "Chờ duyệt",
  duoc_duyet: "Đã duyệt",
  tu_choi: "Từ chối",
  can_sua: "Cần sửa",
};

export const TRANG_THAI_DONG_GOP_ORDER: TrangThaiDongGop[] = [
  "cho_duyet",
  "nhap",
  "can_sua",
  "duoc_duyet",
  "tu_choi",
];

/** Trạng thái contributor được sửa nội dung. */
export function canContributorEditDongGop(
  trangThai: TrangThaiDongGop,
): boolean {
  return trangThai === "nhap" || trangThai === "can_sua" || trangThai === "tu_choi";
}

/** Trạng thái contributor được gửi duyệt. */
export function canContributorSubmitDongGop(
  trangThai: TrangThaiDongGop,
): boolean {
  return trangThai === "nhap" || trangThai === "can_sua" || trangThai === "tu_choi";
}

export type PhamViThamDinh = "toan_cuc" | "linh_vuc" | "bai_viet";

export type VaiTroTacGia = "tac_gia_chinh" | "dong_gop";

export type ArticleDongGopRow = {
  id: string;
  id_bai_viet: string;
  id_nguoi_dong_gop: string;
  noi_dung: string | null;
  trang_thai: TrangThaiDongGop;
  ghi_chu_duyet: string | null;
  id_nguoi_duyet: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
  duyet_luc: string | null;
  da_xoa: boolean;
  hien_thi: boolean;
};

export type ArticleDongGopListItem = ArticleDongGopRow & {
  nguoi_dong_gop?: {
    id: string;
    slug: string | null;
    ten_hien_thi: string | null;
    avatar_id: string | null;
  } | null;
};

export type ArticleTacGiaRow = {
  id: string;
  id_bai_viet: string;
  id_nguoi_dung: string;
  id_dong_gop: string | null;
  vai_tro: VaiTroTacGia;
  la_hien_tai: boolean;
  tao_luc: string;
};

export type ArticleTacGiaListItem = ArticleTacGiaRow & {
  nguoi_dung?: {
    id: string;
    slug: string | null;
    ten_hien_thi: string | null;
    avatar_id: string | null;
  } | null;
};

export type ArticleQuyenThamDinhRow = {
  id: string;
  id_nguoi_dung: string;
  pham_vi: PhamViThamDinh;
  id_linh_vuc: string | null;
  id_bai_viet: string | null;
  cap_boi: string | null;
  tao_luc: string;
  da_xoa: boolean;
};

export type ArticleDongGopAdminItem = ArticleDongGopListItem & {
  bai_viet?: {
    id: string;
    slug: string;
    tieu_de: string;
    loai_bai_viet: LoaiBaiViet | string;
    noi_dung?: string | null;
    id_tac_gia_chinh?: string | null;
  } | null;
};

/** Dòng hiển thị admin — camelCase cho UI client. */
export type AdminDongGopRow = {
  id: string;
  idBaiViet: string;
  trangThai: TrangThaiDongGop;
  noiDung: string | null;
  ghiChuDuyet: string | null;
  taoLuc: string;
  capNhatLuc: string;
  duyetLuc: string | null;
  entity: {
    slug: string;
    tieuDe: string;
    loaiBaiViet: string;
    noiDungChinh: string | null;
    href: string;
  };
  contributor: {
    id: string;
    slug: string | null;
    tenHienThi: string | null;
  } | null;
};

export const SOCIAL_LOAI_ARTICLE_DONG_GOP = "article_dong_gop" as const;
