/** L33 — Shop UGC types (không payment gateway). */

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { getT } from "@/lib/i18n/t";
import { DEFAULT_LOCALE, type CinsLocale } from "@/lib/locale/types";
import type { PublicShopListingItem } from "@/lib/shop/cua-hang-listing-types";
import type { ShopThumbFit } from "@/lib/shop/anh-thumb-fit";

export type ShopLoaiDon = "mua_ngay" | "dat_truoc_nhan_su_kien";

/**
 * Số giờ một đơn `cho_xac_nhan` được coi là "chờ quá lâu" → nền tảng nhắc
 * seller (aging UI). Nền tảng KHÔNG tự hủy; seller tự quyết định.
 */
export const SHOP_DON_NHAC_GIO = 48;

/** Giới hạn ký tự lý do hủy đơn. */
export const SHOP_LY_DO_HUY_MAX = 300;

export type ShopTrangThaiDon =
  | "nhap"
  | "cho_xac_nhan"
  | "da_nhan_tien"
  | "cho_lay_hang"
  | "dang_giao"
  | "da_giao_tai_su_kien"
  | "hoan_thanh"
  | "hoan_tra"
  | "huy";

/** Đếm «đã bán» / uy tín storefront — chỉ đơn hoàn thành (P3b). */
export const SHOP_DON_TINH_DA_BAN: ReadonlyArray<ShopTrangThaiDon> = [
  "hoan_thanh",
];

export type ShopTrangThaiQuay = "cho_xu_ly" | "da_duyet" | "tu_choi";

export type ShopEvidenceKind = "link" | "file" | "text";

export type ShopEvidence = {
  label: string;
  kind: ShopEvidenceKind;
  href?: string;
  detail?: string;
};

export type ShopBienThe = {
  id: string;
  idSanPham: string;
  nhan: string;
  sku: string | null;
  soLuongTon: number;
  /** Trọng lượng gram — seller nhập; null = chưa khai (cần để ship online). */
  canNang: number | null;
  anhId: string | null;
  anhUrl: string | null;
};

/** Trục nhóm: 1 = phân loại 1 (group storefront); 2 = phân loại 2. */
export type ShopNhomTruc = 1 | 2;

/** Nhóm phân loại (`shop_nhom`) — có mô tả ngắn + ảnh card loại. */
export type ShopNhom = {
  id: string;
  truc: ShopNhomTruc;
  nhan: string;
  moTa: string | null;
  anhId: string | null;
  anhUrl: string | null;
  /** Ảnh chồng lên hình mẫu sản phẩm (storefront). */
  overlayAnhId: string | null;
  overlayAnhUrl: string | null;
  /** Ảnh thật sản phẩm phụ (Cloudflare ids). */
  anhPhuIds: string[];
  anhPhuUrls: string[];
  /** Video phụ Cloudflare Stream (tối đa 1). */
  videoPhuId: string | null;
  videoPhuEmbedUrl: string | null;
  videoPhuThumbUrl: string | null;
  /**
   * Giá gốc mặc định (truc=1) — **không còn dùng để hiển thị** trên card/meta.
   * Giữ làm lưới an toàn checkout khi biến thể thiếu `shop_bang_gia_dong`.
   * Card mặt tiền lấy min `shop_bang_gia_dong.gia` của mẫu trong loại.
   */
  giaMacDinh: number | null;
  /** Feature / nổi bật loại hàng (`shop_nhom.noi_bat`, truc=1). */
  noiBat: boolean;
  /** Cache số mẫu (da_xoa=false) gắn nhóm — đồng bộ bằng trigger DB. */
  soMau: number;
  /** Danh mục canonical CINs (`shop_nhom.id_danh_muc`). */
  idDanhMuc: string | null;
  /** Seller/admin đã confirm map danh mục. */
  danhMucXacNhan: boolean;
  /** Slug danh mục — enrich khi list (null nếu chưa map). */
  danhMucSlug: string | null;
  /**
   * Tên seller đề xuất khi loại đang gán `khac` + yêu cầu `moi`.
   * Chỉ để hiện UI Kho — không phải lá canonical / chip hub.
   */
  danhMucDeXuat: string | null;
  /** Parent `id_danh_muc_gan_nhat` của yêu cầu đang `moi` (null nếu đề xuất nhóm mới / chưa rõ). */
  danhMucDeXuatIdCha: string | null;
  /** Tên nhóm cha để gom lá ảo trên Kho (tên cha có sẵn, hoặc «Nhóm cha đề xuất»). */
  danhMucDeXuatChaTen: string | null;
  /**
   * Facet gắn loại — key = slug facet, value = slug giá trị.
   * Enrich khi list. Key `fandom` lấy từ `shop_nhom_fandom` (entity).
   */
  facets: Record<string, string[]>;
  /** Id giá trị facet đang gắn (chat-lieu…) — dùng editor Kho. */
  giaTriIds: string[];
  /** Id bài fandom (`article_bai_viet`) đang gắn — dùng editor Kho. */
  fandomIds: string[];
  /** Ref fandom đã enrich (id + tên) — editor Kho. */
  fandoms: Array<{ id: string; ten: string; slug: string; daVerify: boolean }>;
  thuTu: number;
  taoLuc: string;
};

/** Segment route cho SP không gắn nhóm trên storefront. */
export const SHOP_STOREFRONT_KHAC_SLUG = "khac";

/** Card loại hàng trên `/{slug}/shop`. */
export type ShopStorefrontNhomCard = {
  /** UUID nhóm, hoặc `SHOP_STOREFRONT_KHAC_SLUG` cho orphan. */
  id: string;
  nhan: string;
  moTa: string | null;
  anhUrl: string | null;
  soMau: number;
  giaTu: number | null;
  giaDen: number | null;
  /** Giá gốc mặc định loại (`shop_nhom.gia_mac_dinh`) — ưu tiên hiện trên card. */
  giaMacDinh: number | null;
  tienTe: string;
  soLuongBan: number;
  hetHang: boolean;
  href: string;
  /** Trung bình điểm đánh giá (1 chữ số thập phân), null nếu chưa có. */
  diemTrungBinh: number | null;
  tongDanhGia: number;
  /** Feature / nổi bật loại hàng. */
  noiBat: boolean;
};

/** Mẫu (san_pham) trên trang loại. */
export type ShopStorefrontMau = {
  sanPhamId: string;
  ten: string;
  anhUrl: string | null;
  /** Feature / nổi bật — đẩy lên đầu + highlight trên chip mẫu. */
  noiBat: boolean;
  /** Nhãn thẻ lọc trục 1 (`shop_san_pham.phan_loai`). */
  phanLoai: string | null;
  /** Nhãn thẻ lọc trục 2 (`shop_san_pham.phan_loai_2`). */
  phanLoai2: string | null;
  bienThe: Array<{
    id: string;
    nhan: string;
    anhUrl: string | null;
    soLuongTon: number;
    soLuongBan: number;
    giaHienThi: number | null;
    giaGoc: number | null;
    tienTe: string;
    hetHang: boolean;
  }>;
};

export type ShopStorefrontNhomDetail = {
  id: string;
  nhan: string;
  moTa: string | null;
  anhUrl: string | null;
  /** Lớp chồng lên ảnh mẫu trên trang loại. */
  overlayAnhUrl: string | null;
  /** Ảnh thật sản phẩm phụ. */
  anhPhuUrls: string[];
  /** Video phụ Cloudflare Stream (tối đa 1). */
  videoPhuId: string | null;
  videoPhuEmbedUrl: string | null;
  videoPhuThumbUrl: string | null;
  /** Giá gốc mặc định loại (`shop_nhom.gia_mac_dinh`). */
  giaMacDinh: number | null;
  /** Giá thấp nhất / cao nhất trong mẫu (fallback khi chưa đặt giaMacDinh). */
  giaTu: number | null;
  giaDen: number | null;
  tienTe: string;
  sellerId: string;
  ownerSlug: string;
  mau: ShopStorefrontMau[];
  isKhac: boolean;
};

export type ShopNhomDanhGia = {
  id: string;
  idNhom: string;
  idNguoiDung: string;
  tenHienThi: string | null;
  slug: string | null;
  avatarUrl: string | null;
  diem: number;
  noiDung: string | null;
  anhUrls: string[];
  mauDaMua: string[];
  taoLuc: string;
  isMine: boolean;
};

export const SHOP_NHOM_DANH_GIA_NOI_DUNG_MAX = 2000;
export const SHOP_NHOM_DANH_GIA_ANH_MAX = 6;
/** Ảnh thật phụ trên loại hàng (`shop_nhom.anh_phu_ids`). */
export const SHOP_NHOM_ANH_PHU_MAX = 8;

/** Trần ảnh prefill bài «Giới thiệu sản phẩm» (album ImageGrid). */
export const SHOP_GIOI_THIEU_ANH_MAX = 24;

/**
 * @deprecated Đã bỏ giới hạn lượt (2026-08-11). Giữ hằng = 0 để caller cũ không vỡ.
 */
export const SHOP_GIOI_THIEU_COOLDOWN_DAYS = 0;

/**
 * Trần dòng `shop_post_hang` (= biến thể) trên 1 bài Journey.
 * Áp cho mọi luồng gắn hàng (modal + tự gắn từ Kho).
 */
export const SHOP_POST_HANG_MAX = 20;

export type ShopSanPham = {
  id: string;
  ten: string;
  moTa: string | null;
  anhId: string | null;
  anhUrl: string | null;
  /** Ô vuông: vừa khung (`contain`) hoặc lấp khung (`cover`). */
  anhThumbFit: ShopThumbFit;
  /** Nhãn phân loại / nhóm (denormalized từ `shop_nhom.nhan`). */
  phanLoai: string | null;
  /** Nhãn phân loại thứ hai (denormalized từ `shop_nhom.nhan` truc=2). */
  phanLoai2: string | null;
  /** FK `shop_nhom` truc=1. */
  idNhom?: string | null;
  /** FK `shop_nhom` truc=2. */
  idNhom2?: string | null;
  dangBan: boolean;
  /** Feature / nổi bật (`shop_san_pham.noi_bat`). */
  noiBat: boolean;
  bienThe: ShopBienThe[];
  taoLuc: string;
};

/** Tối đa sản phẩm được đánh Feature trên một cửa hàng. */
export const SHOP_FEATURE_MAX = 12;

/** Tối đa loại hàng (truc=1) được đánh Feature trên một cửa hàng. */
export const SHOP_NHOM_FEATURE_MAX = 4;

export type ShopBangGiaDong = {
  id: string;
  idBienThe: string;
  /** Giá bán (niêm yết). */
  gia: number;
  /** Giá giảm / khuyến mãi — null = không giảm. */
  giaGiam: number | null;
};

/** Giá khách trả: ưu tiên `giaGiam` nếu có. */
export function shopGiaHieuLuc(dong: {
  gia: number;
  giaGiam?: number | null;
}): number {
  return dong.giaGiam != null ? dong.giaGiam : dong.gia;
}

export type ShopBangGia = {
  id: string;
  ten: string;
  tienTe: string;
  ghiChu: string | null;
  dong: ShopBangGiaDong[];
  taoLuc: string;
};

export type ShopPostHangItem = {
  id: string;
  idBienThe: string;
  idSanPham: string;
  tenSanPham: string;
  nhanBienThe: string;
  /** Nhãn phân loại từ `shop_san_pham.phan_loai`. */
  phanLoai: string | null;
  /** Nhãn phân loại 2 từ `shop_san_pham.phan_loai_2`. */
  phanLoai2: string | null;
  anhUrl: string | null;
  /** Ô vuông kiosk/giỏ — từ `shop_san_pham.anh_thumb_fit`. */
  anhThumbFit: ShopThumbFit;
  soLuongTon: number;
  /** Tổng số lượng đã bán (dòng đơn đã trừ kho). */
  soLuongBan: number;
  giaHienThi: number;
  tienTe: string;
  idBangGia: string | null;
  thuTu: number;
  hetHang: boolean;
};

/** Card sản phẩm trên storefront `/{slug}/shop` — catalog đang bán. */
export type ShopStorefrontItem = {
  sanPhamId: string;
  /** Biến thể dùng để hiện giá / thêm giỏ (giá tốt nhất). */
  idBienThe: string | null;
  /** Có khi biến thể còn gắn kiosk public — link bài (tuỳ chọn). */
  hangId: string | null;
  idCotMoc: string | null;
  postHref: string | null;
  tenSanPham: string;
  nhanBienThe: string | null;
  anhUrl: string | null;
  anhThumbFit?: ShopThumbFit;
  /** Null nếu chưa có dòng giá trong bảng giá nào. Giá khách trả (ưu tiên giảm). */
  giaHienThi: number | null;
  /**
   * Giá bán niêm yết khi đang giảm — hiện gạch ngang.
   * Null = không giảm (chỉ hiện `giaHienThi`).
   */
  giaGoc: number | null;
  tienTe: string;
  /** Tồn biến thể đang hiện giá (không phải tổng mọi biến thể). */
  soLuongTon: number;
  /** Tổng SL đã bán của biến thể đang hiện. */
  soLuongBan: number;
  hetHang: boolean;
  noiBat: boolean;
  /** Phân loại 1 — dùng group layout mặt tiền. */
  phanLoai: string | null;
  phanLoai2: string | null;
  /** FK `shop_nhom` truc=1 — để seller sửa mô tả nhóm. */
  idNhom: string | null;
  /** Tên loại hàng (`shop_nhom.nhan`). */
  tenLoai: string | null;
  /** Mô tả ngắn nhóm phân loại 1 (`shop_nhom.mo_ta`). */
  phanLoaiMoTa: string | null;
};

export type ShopGioDong = {
  idBienThe: string;
  soLuong: number;
  tenSanPham: string;
  nhanBienThe: string;
  giaHienThi: number;
  tienTe: string;
  anhUrl: string | null;
  /** Ô vuông — từ mẫu (`shop_san_pham.anh_thumb_fit`). */
  anhThumbFit?: ShopThumbFit;
  soLuongTon: number;
};

export type ShopGio = {
  id: string | null;
  /** Giỏ theo post-kiosk — null khi giỏ storefront. */
  idCotMoc: string | null;
  /** Giỏ theo cửa hàng — null khi giỏ post-kiosk. */
  idCuaHang: string | null;
  dong: ShopGioDong[];
  tongTien: number;
  tienTe: string;
};

/** Dòng trong giỏ chung — kèm seller để nhóm theo cửa hàng. */
export type ShopGioChungDong = ShopGioDong & {
  idSanPham: string;
  /** Loại hàng (shop_nhom truc=1) — khớp combo phạm vi loai_hang. */
  idNhom: string | null;
  /** Chủ sản phẩm (seller). */
  idNguoiBan: string;
  /** true khi sản phẩm/biến thể đã ngừng bán hoặc bị xóa. */
  ngungBan: boolean;
};

/** Combo đã áp trên một nhóm giỏ (preview / snapshot). */
export type ShopComboApDung = {
  idCombo: string;
  ten: string;
  soLan: number;
  tien: number;
};

/** Một nhóm hàng cùng một cửa hàng trong giỏ chung — checkout theo nhóm. */
export type ShopGioChungNhom = {
  idNguoiBan: string;
  /** shop_cua_hang.id của seller — dùng cho checkout + link mặt tiền. */
  idCuaHang: string | null;
  tenCuaHang: string;
  /** slug user để link `/{slug}/shop`. */
  sellerSlug: string | null;
  avatarUrl: string | null;
  /** Seller đã có phương thức nhận tiền → mới gửi đơn được. */
  coThanhToan: boolean;
  dong: ShopGioChungDong[];
  /** Tiền hàng trước giảm combo/voucher. */
  tongHang: number;
  /** Giảm từ combo (0 nếu không khớp). */
  giamCombo: number;
  comboApDung: ShopComboApDung[];
  /** Tổng buyer trả (= tongHang − giamCombo − giamVoucher preview nếu có). */
  tongTien: number;
  tienTe: string;
  /** Có ít nhất một dòng hết tồn / ngừng bán. */
  coVanDe: boolean;
};

export type ShopLoaiGiam = "phan_tram" | "so_tien";
export type ShopComboPhamVi = "loai_hang" | "san_pham" | "bien_the";
export type ShopVoucherDesign = "mac_dinh" | "rieng";

export type ShopComboDieuKien = {
  id: string;
  idCombo: string;
  phamVi: ShopComboPhamVi;
  idNhom: string | null;
  idSanPham: string | null;
  idBienThe: string | null;
  soLuong: number;
  /** Nhãn hiển thị (loại / mẫu / biến thể) — optional khi list. */
  nhan?: string | null;
  /** Ảnh thumb enrich khi list — optional. */
  anhUrl?: string | null;
};

export type ShopCombo = {
  id: string;
  idNguoiDung: string;
  ten: string;
  moTa: string | null;
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
  giamToiDa: number | null;
  apDungLap: boolean;
  batDau: string | null;
  ketThuc: string | null;
  kichHoat: boolean;
  thuTu: number;
  taoLuc: string;
  dieuKien: ShopComboDieuKien[];
  /** true nếu có điều kiện trỏ entity đã xóa. */
  dieuKienLoi?: boolean;
};

export type ShopVoucher = {
  id: string;
  idNguoiDung: string;
  ma: string;
  ten: string;
  moTa: string | null;
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
  giamToiDa: number | null;
  donToiThieu: number;
  soLuongTong: number | null;
  soLuongDaDung: number;
  gioiHanMoiNguoi: number;
  batDau: string | null;
  ketThuc: string | null;
  kichHoat: boolean;
  congKhai: boolean;
  designKieu: ShopVoucherDesign;
  designAnhId: string | null;
  designAnhUrl: string | null;
  designMauNen: string | null;
  designMauChu: string | null;
  designNhan: string | null;
  taoLuc: string;
};

/** Lý do voucher trong ví không còn dùng được. */
export type ShopVoucherLyDoHet =
  | "het_luot"
  | "het_han"
  | "chua_bat_dau"
  | "da_dung"
  | "tat"
  | "xoa";

/** Branding shop hiển thị trên thẻ voucher. */
export type ShopVoucherShopBranding = {
  tenCuaHang: string | null;
  sellerSlug: string | null;
  shopAvatarUrl: string | null;
  shopBannerUrl: string | null;
};

export type ShopVoucherCongKhaiItem = ShopVoucher &
  ShopVoucherShopBranding & {
    daLuu: boolean;
    /** Số người đã lưu ví, chưa dùng mã (lưu ≠ giữ chỗ). */
    soLuongDaLuu: number;
  };

export type ShopVoucherViItem = ShopVoucher & {
  daLuu: true;
  luuLuc: string;
  conHieuLuc: boolean;
  lyDoHetHieuLuc: ShopVoucherLyDoHet | null;
} & ShopVoucherShopBranding;

/** Snapshot giảm giá lưu trên đơn (giam_snapshot jsonb). */
export type ShopGiamSnapshot = {
  combo?: ShopComboApDung[];
  voucher?: { id: string; ma: string; ten: string; tien: number };
};

/** Giỏ chung (giỏ chờ mua) — gom mọi cửa hàng, nhóm theo seller. */
export type ShopGioChung = {
  id: string | null;
  nhom: ShopGioChungNhom[];
  /** Tổng số dòng (badge). */
  tongSoDong: number;
};

export type ShopDonHangDong = {
  id: string;
  idBienThe: string | null;
  tenSnapshot: string;
  nhanSnapshot: string | null;
  soLuong: number;
  giaDonVi: number;
  /** Ảnh biến thể / sản phẩm hiện tại (không snapshot — có thể null nếu đã xóa). */
  anhUrl?: string | null;
  /** Phân loại sản phẩm hiện tại (`shop_san_pham.phan_loai`). */
  phanLoai?: string | null;
  /** Phân loại 2 sản phẩm hiện tại (`shop_san_pham.phan_loai_2`). */
  phanLoai2?: string | null;
};

/** Snapshot STK/QR lúc tạo đơn — không đổi khi seller sửa TK sau. */
export type ShopThanhToanSnapshot = {
  idPhuongThuc: string | null;
  nganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  qrAnhId: string | null;
  qrAnhUrl: string | null;
  /** Nội dung chuyển khoản gợi ý (= mã đơn). */
  noiDungCk: string;
  tongTien: number;
  tienTe: string;
};

export type ShopPhuongThucTt = {
  id: string;
  idCuaHang: string;
  nganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  qrAnhId: string | null;
  qrAnhUrl: string | null;
  macDinh: boolean;
  kichHoat: boolean;
  thuTu: number;
  taoLuc: string;
};

/** Nhãn trục mặc định khi seller chưa đổi tên cột phân loại. */
export const SHOP_NHAN_PHAN_LOAI_DEFAULT = "Phân loại";
export const SHOP_NHAN_PHAN_LOAI_2_DEFAULT = "Phân loại 2";

/** Giới hạn mô tả ngắn nhóm phân loại (`shop_nhom.mo_ta`). */
export const SHOP_NHOM_MO_TA_MAX = 280;

export type ShopTrangThaiHoatDong =
  | "hoat_dong"
  | "canh_bao"
  | "han_che"
  | "khoa";

export type ShopHinhThucGiao = "truc_tiep" | "online" | "tai_su_kien";

export type ShopCuaHang = {
  id: string;
  idNguoiDung: string;
  ten: string | null;
  moTa: string | null;
  avatarId: string | null;
  avatarUrl: string | null;
  coverId: string | null;
  coverUrl: string | null;
  /** Banner sự kiện trên mặt tiền (`shop_cua_hang.banner_su_kien_id`). */
  bannerSuKienId: string | null;
  bannerSuKienUrl: string | null;
  /** Hiện banner sự kiện trên mặt tiền (`shop_cua_hang.banner_su_kien_hien`). */
  bannerSuKienHien: boolean;
  chinhSach: string | null;
  lienHe: string | null;
  /** Tên cột/trục phân loại 1 (`shop_cua_hang.nhan_phan_loai`). Null → mặc định UI. */
  nhanPhanLoai: string | null;
  /** Tên cột/trục phân loại 2 (`shop_cua_hang.nhan_phan_loai_2`). */
  nhanPhanLoai2: string | null;
  /** Seller bật chế độ nghỉ tạm (`shop_cua_hang.tam_dong`). */
  tamDong: boolean;
  /** Bắt đầu nghỉ — ISO timestamptz. */
  tamDongTu: string | null;
  /** Mở lại — ISO timestamptz. */
  tamDongDen: string | null;
  /** Lý do nghỉ tạm (tuỳ chọn). */
  tamDongLyDo: string | null;
  /** Cổng gate nền tảng (nợ phí + tranh chấp) — tách biệt `tamDong`. */
  trangThaiHoatDong: ShopTrangThaiHoatDong;
  lyDoKhoa: string | null;
  /** Cache số khiếu nại chưa đóng — dẫn xuất nhãn cảnh báo. */
  soTranhChapMo: number;
  phuongThucTt: ShopPhuongThucTt[];
  /** Có ≥1 phương thức nhận tiền đang bật. */
  sanSangNhanDon: boolean;
  taoLuc: string;
  capNhatLuc: string;
};

/** Bản mặt tiền / khách — giữ `sanSangNhanDon`, không kèm STK / QR / PTTT. */
export function toPublicShop(shop: ShopCuaHang): ShopCuaHang {
  if (shop.phuongThucTt.length === 0) return shop;
  return { ...shop, phuongThucTt: [] };
}

export function resolveShopNhanPhanLoai(
  shop: Pick<ShopCuaHang, "nhanPhanLoai"> | null | undefined,
): string {
  return shop?.nhanPhanLoai?.trim() || SHOP_NHAN_PHAN_LOAI_DEFAULT;
}

export function resolveShopNhanPhanLoai2(
  shop: Pick<ShopCuaHang, "nhanPhanLoai2"> | null | undefined,
): string {
  return shop?.nhanPhanLoai2?.trim() || SHOP_NHAN_PHAN_LOAI_2_DEFAULT;
}

export type ShopDonHang = {
  id: string;
  /** Mã đơn công khai (TENNGUOIMUA-12345). */
  maDon: string | null;
  idNguoiMua: string;
  idNguoiBan: string;
  idCotMoc: string | null;
  idSuKien: string | null;
  loaiDon: ShopLoaiDon;
  trangThai: ShopTrangThaiDon;
  tienTe: string;
  /** Tiền hàng trước giảm (null trên đơn cũ trước migration). */
  tongHang?: number | null;
  tienGiamCombo?: number;
  tienGiamVoucher?: number;
  idVoucher?: string | null;
  giamSnapshot?: ShopGiamSnapshot | null;
  /** Số buyer thực trả (sau giảm). */
  tongTien: number;
  ghiChu: string | null;
  daTruKho: boolean;
  dong: ShopDonHangDong[];
  muaTen?: string | null;
  banTen?: string | null;
  /** Username (slug) — để mở card hồ sơ khi click tên đối phương. */
  muaSlug?: string | null;
  banSlug?: string | null;
  /** Avatar URL đối phương (hiện cạnh tên trong modal). */
  muaAvatarUrl?: string | null;
  banAvatarUrl?: string | null;
  taoLuc: string;
  xacNhanLuc: string | null;
  /** Thời điểm seller đánh dấu hoàn thành (`hoan_thanh`). */
  hoanThanhLuc?: string | null;
  /** Người đánh dấu hoàn thành (seller). */
  hoanThanhBoi?: string | null;
  /** Thời điểm hủy (`huy`). */
  huyLuc?: string | null;
  /** Lý do hủy (seller nhập; hệ thống ghi "Hết hạn xác nhận"). */
  lyDoHuy?: string | null;
  /** Người thực hiện hủy — null nếu hệ thống auto-expire. */
  huyBoi?: string | null;
  /** Shop nhờ khách hủy đơn `da_nhan_tien`. */
  yeuCauHuyLuc?: string | null;
  yeuCauHuyLyDo?: string | null;
  yeuCauHuyBoi?: string | null;
  /** Snapshot chấp nhận rủi ro chuyển khoản (`mua_ngay`). */
  nguoiMuaChapNhanLuc?: string | null;
  nguoiMuaChapNhanVanBan?: string | null;
  nguoiMuaChapNhanPhienBan?: string | null;
  /** Snapshot nhận tiền lúc tạo đơn (`mua_ngay`). */
  thanhToanSnapshot?: ShopThanhToanSnapshot | null;
  /** Ảnh biên lai chuyển khoản buyer đính kèm lúc gửi đơn (giỏ chung). */
  bienLaiAnhUrl?: string | null;
  bienLaiAnhId?: string | null;
  /** Snapshot thông tin nhận hàng — shop tự ship ngoài CINs (copy / export / phiếu). */
  muaHoTen?: string | null;
  muaSoDienThoai?: string | null;
  /** Địa chỉ đầy đủ (chi tiết + tỉnh/thành) đã gộp sẵn. */
  muaDiaChi?: string | null;
  muaDiaChiChiTiet?: string | null;
  muaPhuongXa?: string | null;
  muaPhuongXaCode?: string | null;
  muaTinhThanh?: string | null;
  /** truc_tiep | online (ĐVVC, buyer trả ship) | tai_su_kien */
  hinhThucGiao?: "truc_tiep" | "online" | "tai_su_kien" | null;
  /** Link tracking shop tự dán (CINs không liên kết ĐVVC). */
  vanChuyenLink?: string | null;
  /** Mã vận đơn shop nhập. */
  vanChuyenMa?: string | null;
  /** Đơn vị vận chuyển shop chọn. */
  vanChuyenDvvc?: string | null;
  /** P3a khảo sát / đóng đơn */
  khaoSatLuc?: string | null;
  khaoSatTraLoi?: "da_nhan" | "chua_nhan" | null;
  soLanHoanChuaNhan?: number;
  hoanKhaoSatDen?: string | null;
  dongTuDongLuc?: string | null;
  dongBoi?: "buyer" | "seller" | "he_thong" | null;
};
/** Sự kiện sắp/đang diễn ra mà shop đã được duyệt quầy — mặt tiền công khai. */
export type ShopQuaySapCoMat = {
  id: string;
  idSuKien: string;
  ten: string;
  batDau: string | null;
  ketThuc: string | null;
  orgTen: string | null;
  coverSrc: string | null;
  href: string;
  status: "upcoming" | "active";
};

/** Hàng gắn bài quầy — haystack tìm + card catalog khi Search hàng. */
export type ShopQuayHangSearch = {
  hangId: string;
  idBienThe: string;
  idSanPham: string;
  tenSanPham: string;
  nhanBienThe: string;
  phanLoai: string | null;
  phanLoai2: string | null;
  /** FK loại hàng (`shop_nhom`) — null = chưa gán / «Khác». */
  idNhom: string | null;
  /** Tên loại hàng (`shop_nhom.nhan`). */
  tenLoai: string | null;
  anhUrl: string | null;
  /** Ô vuông catalog quầy — từ `shop_san_pham.anh_thumb_fit`. */
  anhThumbFit?: ShopThumbFit;
  soLuongTon: number;
  soLuongBan: number;
  giaHienThi: number;
  tienTe: string;
  hetHang: boolean;
};

export type ShopQuaySuKien = {
  id: string;
  idSuKien: string;
  idNguoiDung: string;
  idCotMoc: string | null;
  bangChung: ShopEvidence[];
  trangThai: ShopTrangThaiQuay;
  lyDoTuChoi: string | null;
  nguoiDungTen?: string | null;
  nguoiDungSlug?: string | null;
  nguoiDungAvatarUrl?: string | null;
  /** Meta sự kiện — list “quầy của tôi”. */
  suKienTen?: string | null;
  suKienSlug?: string | null;
  suKienBatDau?: string | null;
  orgTen?: string | null;
  taoLuc: string;
  /** Card shop (listing `/shopping`) — mặt tiền quầy sự kiện. */
  shop?: PublicShopListingItem | null;
  /**
   * Legacy — bài gắn quầy (không còn hydrate ở list quầy công khai).
   */
  cotMoc?: MilestoneItem | null;
  /** Catalog shop / post-kiosk — haystack chế độ xem Hàng. */
  hangSearch?: ShopQuayHangSearch[];
};

export const SHOP_LOAI_DON_LABEL: Record<ShopLoaiDon, string> = {
  mua_ngay: "Mua ngay — thanh toán luôn",
  dat_truoc_nhan_su_kien: "Đặt trước — thanh toán sau",
};

export const SHOP_TRANG_THAI_DON_LABEL: Record<ShopTrangThaiDon, string> = {
  nhap: "Nháp",
  cho_xac_nhan: "Chờ xác nhận",
  da_nhan_tien: "Đã nhận tiền / đang soạn",
  cho_lay_hang: "Chờ lấy hàng",
  dang_giao: "Đang giao đơn",
  da_giao_tai_su_kien: "Thanh toán khi nhận hàng",
  hoan_thanh: "Hoàn thành",
  hoan_tra: "Hoàn trả",
  huy: "Đã hủy",
};

const SHOP_STATUS_MSG = {
  nhap: "shop.status.nhap",
  cho_xac_nhan: "shop.status.cho_xac_nhan",
  da_nhan_tien: "shop.status.da_nhan_tien",
  cho_lay_hang: "shop.status.cho_lay_hang",
  dang_giao: "shop.status.dang_giao",
  da_giao_tai_su_kien: "shop.status.da_giao_tai_su_kien",
  hoan_thanh: "shop.status.hoan_thanh",
  hoan_tra: "shop.status.hoan_tra",
  huy: "shop.status.huy",
} as const;

const SHOP_LOAI_MSG = {
  mua_ngay: "shop.loai.mua_ngay",
  dat_truoc_nhan_su_kien: "shop.loai.dat_truoc_nhan_su_kien",
} as const;

/** Nhãn trạng thái đơn theo locale — buyer view. Map VI cũ giữ cho seller dashboard. */
export function shopTrangThaiDonLabel(
  status: ShopTrangThaiDon,
  locale: CinsLocale = DEFAULT_LOCALE,
): string {
  return getT(locale)(SHOP_STATUS_MSG[status]);
}

export function shopLoaiDonLabel(
  loai: ShopLoaiDon,
  locale: CinsLocale = DEFAULT_LOCALE,
): string {
  return getT(locale)(SHOP_LOAI_MSG[loai]);
}

export const SHOP_TRANG_THAI_QUAY_LABEL: Record<ShopTrangThaiQuay, string> = {
  cho_xu_ly: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  tu_choi: "Đã rút / từ chối",
};
