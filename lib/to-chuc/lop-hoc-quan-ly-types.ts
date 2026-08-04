import type {
  HinhThucLop,
  LoaiMoHinhKhoa,
  TrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-types";

/** Hàng bảng quản lý lớp — safe cho client (không server-only). */
export type LopHocQuanLyRow = {
  id: string;
  maLop: string | null;
  lichHoc: string | null;
  hinhThuc: HinhThucLop;
  ngayKhaiGiang: string | null;
  slotToiDa: number | null;
  trangThaiLop: TrangThaiLop;
  giaoVienPhuTrach: string | null;
  giaoVienText: string | null;
  giaoVienTen: string | null;
  /** Slug Journey — null khi GV chỉ có tên thủ công. */
  giaoVienSlug: string | null;
  giaoVienAvatarId: string | null;
  giaoVienAvatarUrl: string | null;
  khoaId: string;
  khoaSlug: string;
  tenKhoa: string;
  loaiMoHinh: LoaiMoHinhKhoa;
  soHocVien: number;
  /** Thumbnail phòng chat lớp (`chat_phong.avatar_id`). */
  avatarId: string | null;
  avatarUrl: string | null;
  /** Chi nhánh gắn lớp (offline / kết hợp). */
  chiNhanhIds: string[];
  chiNhanh: Array<{ id: string; ten: string; diaChi: string | null }>;
};
