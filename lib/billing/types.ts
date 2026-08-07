/** Types chung billing hub (P1) — đọc từ nguồn cũ, chưa cắt sang cins_hoa_don. */

export type DichVuLoai = "csdt_phi" | "shop_phi" | "ads";

export type TkTrangThai = "hoat_dong" | "canh_bao" | "han_che" | "khoa";

export type DichVuTrangThai = "hoat_dong" | "tam_dung" | "dong";

export type HoaDonTrangThai =
  | "chua_chot"
  | "chua_tra"
  | "da_tra"
  | "qua_han"
  | "mien";

export type HoaDonNguon = "org_phi_ky" | "shop_phi_ky";

/** Type hoá đơn chung — adapter từ org_phi_ky + shop_phi_ky. */
export type HoaDon = {
  id: string;
  nguon: HoaDonNguon;
  idDichVu: string | null;
  loai: DichVuLoai;
  thamChieuId: string;
  tenDichVu: string;
  tuNgay: string;
  denNgay: string;
  ngayChot: string;
  hanTra: string | null;
  /** Doanh thu / GMV kỳ (shop = GMV; CSĐT = DT học phí ghi nhận). */
  doanhThuVnd: number | null;
  /** Tỉ lệ phí áp cho kỳ này. */
  tyLe: number | null;
  soTienVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  conNoVnd: number;
  trangThai: HoaDonTrangThai;
  /** Mã CK Sepay — org đã có; shop P1 sinh display-only (chưa persist). */
  maThamChieu: string | null;
  /** id kỳ nguồn (shop_phi_ky / org_phi_ky) — enrich GMV. */
  nguonId?: string | null;
  /** Còn được bấm «Tôi đã chuyển rồi» không (server). */
  coTheTuKhai?: boolean;
  /** ISO hết cửa sổ ân hạn tự khai (nếu đang trong cửa sổ). */
  anHanDenIso?: string | null;
  /** Số lần đã tự khai (hub). */
  tuKhaiLan?: number;
};

export type CinsTkThanhToan = {
  id: string;
  idNguoiDung: string;
  tenPhapNhan: string | null;
  mst: string | null;
  diaChi: string | null;
  emailHoaDon: string | null;
  hanMucVnd: number;
  trangThai: TkTrangThai;
  lyDoKhoaTuDong: string | null;
  lyDoKhoaThuCong: string | null;
  noDaXoaVnd: number;
  taoLuc: string;
  capNhatLuc: string;
};

export type CinsDichVu = {
  id: string;
  idTk: string;
  loai: DichVuLoai;
  thamChieuId: string;
  tyLe: number | null;
  nguongChotVnd: number | null;
  toiThieuXuatKyVnd: number | null;
  soNgayHanTra: number | null;
  daDungChayThu: boolean;
  trangThai: DichVuTrangThai;
  hdTenPhapNhan: string | null;
  hdMst: string | null;
  hdDiaChi: string | null;
  hdEmail: string | null;
  /** Tên hiển thị (org.ten / «Shop»). */
  tenHienThi?: string;
};

export type CinsNguoiPhuTrach = {
  id: string;
  idTk: string;
  idNguoiDung: string;
  vaiTro: "quan_ly";
  taoLuc: string;
  tenHienThi?: string | null;
  slug?: string | null;
};

export type DichVuNoTong = {
  dichVu: CinsDichVu;
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  soKyNo: number;
  /** Hệ quả khi nợ / trạng thái gate hiện tại. */
  heQua?: DichVuHeQua | null;
  /** Phí đang tích luỹ kỳ mở (chưa vào hoá đơn). */
  dangTichLuy?: DichVuDangTichLuy | null;
  quanLyHref?: string | null;
};

export type DichVuHeQua = {
  loai: "binh_thuong" | "canh_bao" | "han_che" | "khoa_nhan_don" | "khoa_ghi_danh";
  trangThai: string;
  lyDo: string | null;
  moTa: string | null;
};

export type DichVuDangTichLuy = {
  doanhThuVnd: number;
  phiDuKienVnd: number;
  nguongXuatKyVnd: number;
  duoiNguong: boolean;
  ngayChotDuKien: string | null;
};

/** Ghim đầu Journey khi còn nợ (chỉ owner). */
export type BillingJourneyPin = {
  tongNoVnd: number;
  soHoaDonNo: number;
  hanTraGanNhat: string | null;
};

export type BillingHubPayload = {
  tk: CinsTkThanhToan | null;
  laChu: boolean;
  canSua: boolean;
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  theoDichVu: DichVuNoTong[];
  hoaDon: HoaDon[];
  /** Tỉ lệ / ngưỡng đang áp dụng (từ /admin/tai-chinh) — minh bạch cho user. */
  phiCongKhai: {
    shopTyLe: number;
    shopToiThieuXuatKyVnd: number;
    csdtTyLe: number;
    csdtNguongVnd: number;
  };
  thanhToan: {
    available: boolean;
    bank: {
      ten: string | null;
      soTk: string | null;
      chuTk: string | null;
      bin: string | null;
    } | null;
    /** Kỳ ưu tiên (hạn gần nhất còn nợ). */
    maThamChieu: string | null;
    soTienVnd: number | null;
    hanTra: string | null;
    qrUrl: string | null;
    hoaDonId: string | null;
  };
  phuTrach: CinsNguoiPhuTrach[];
  khieuNai: Array<{
    id: string;
    nguon: "cins" | "org_legacy";
    idHoaDon: string | null;
    idDichVu: string | null;
    orgId: string | null;
    loai: string;
    noiDung: string;
    maGiaoDich: string | null;
    anhIds: string[];
    trangThai: string;
    phanHoiAdmin: string | null;
    taoLuc: string;
    tenDichVu: string | null;
  }>;
};
