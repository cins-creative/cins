export type AdminTagLoaiFilter = "keyword" | "phan_mem" | "all";

export type AdminTagVerifyFilter = "chua_verify" | "da_verify" | "all";

export type AdminTagSort = "pho_bien" | "moi_nhat" | "a_z";

export type AdminTagListParams = {
  loai: AdminTagLoaiFilter;
  trang_thai: AdminTagVerifyFilter;
  sort: AdminTagSort;
  q: string;
  page: number;
  limit: number;
};

export type AdminTagListRow = {
  id: string;
  tieu_de: string;
  slug: string;
  loai_bai_viet: "keyword" | "phan_mem";
  da_verify: boolean;
  tom_tat: string | null;
  so_nguoi_tagged: number;
  so_tac_pham_tagged: number;
  tao_luc: string;
};

export type AdminTagListResponse = {
  rows: AdminTagListRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminTagPickerRow = {
  id: string;
  tieu_de: string;
  da_verify: boolean;
  loai_bai_viet: "keyword" | "phan_mem";
};
