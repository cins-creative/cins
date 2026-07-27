export type AutopilotTab = "tong-quan" | "pipeline" | "nick";

/** Bước trong pipeline đăng bài (một process). */
export type AutopilotPipelineBuoc =
  | "moi"
  | "cho_duyet"
  | "san_sang"
  | "da_dang";

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
  /** Nick bật theo kênh (nguon:…). */
  theoKenh: Record<string, number>;
  /** Mục `moi` trong hàng đợi theo nền tảng. */
  mucMoiTheoKenh: Record<string, number>;
};

export type AutopilotNickRow = {
  id: string;
  slug: string;
  idNguoiDung: string | null;
  niche: string[];
  kenh: string | null;
  dangBat: boolean;
  /** Giai đoạn 7: bật thả emoji/comment ảo cho nick này. */
  tuongTacBat: boolean;
  hanMucNgay: number;
  ghiChu: string | null;
  homNayDaDang: number;
  homNayHanMuc: number;
  avatarUrl: string | null;
  tenHienThi: string | null;
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
  avatarUrl: string | null;
  tenHienThi: string | null;
  /** Gợi ý giờ đăng thật sau khi duyệt (cron + hạn mức nick). */
  duKienDang: string | null;
  hanMucConLai: number | null;
  sanSangTruoc: number | null;
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
