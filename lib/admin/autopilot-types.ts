export type AutopilotTab =
  | "tong-quan"
  | "nick"
  | "nguon"
  | "muc"
  | "duyet"
  | "da-dang";

export type NenTangAuto = "artstation" | "behance" | "pixiv" | "khac";

export type AutopilotOverview = {
  ngayVn: string;
  dem: {
    nick: number;
    nickBat: number;
    nguon: number;
    nguonBat: number;
    mucMoi: number;
    choDuyet: number;
    sanSang: number;
    daDangOk: number;
  };
  env: {
    coSecretDangBai: boolean;
    coSiteUrl: boolean;
    coAnthropic: boolean;
  };
  theoKenh: Record<string, number>;
};

export type AutopilotNickRow = {
  id: string;
  slug: string;
  idNguoiDung: string | null;
  niche: string[];
  kenh: string | null;
  dangBat: boolean;
  hanMucNgay: number;
  ghiChu: string | null;
  homNayDaDang: number;
  homNayHanMuc: number;
};

export type AutopilotNguonRow = {
  id: string;
  nenTang: string;
  urlHoSo: string;
  maNgoai: string | null;
  tenHienThi: string | null;
  niche: string | null;
  dangBat: boolean;
  lanQuetLuc: string | null;
  ghiChu: string | null;
};

export type AutopilotMucRow = {
  id: string;
  urlCanonic: string;
  nenTang: string;
  tieuDeGoc: string | null;
  tenTacGia: string | null;
  anhBiaUrl: string | null;
  trangThai: string;
  taoLuc: string;
};

export type AutopilotBanThaoRow = {
  id: string;
  tieuDe: string | null;
  moTa: string | null;
  dongGhiNguon: string | null;
  trangThai: string;
  taoLuc: string;
  slug: string | null;
  urlCanonic: string | null;
  nenTang: string | null;
  anhBiaUrl: string | null;
  tenTacGia: string | null;
};

export type AutopilotDaDangRow = {
  id: string;
  urlCanonic: string | null;
  thanhCong: boolean;
  loi: string | null;
  duongDan: string | null;
  slugBai: string | null;
  taoLuc: string;
  slugNick: string | null;
};
