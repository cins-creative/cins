export type AdminToChucLoaiFilter =
  | "all"
  | "truong_dai_hoc"
  | "co_so_dao_tao"
  | "cong_dong"
  | "studio";

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
