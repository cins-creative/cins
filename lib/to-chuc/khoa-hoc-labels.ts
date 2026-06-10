import type {
  HinhThucLop,
  LoaiMoHinhKhoa,
  TrinhDoDauVao,
  TrangThaiKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc-types";

export function labelLoaiMoHinhKhoa(loai: LoaiMoHinhKhoa): string {
  switch (loai) {
    case "cohort_co_dinh":
      return "Cohort cố định";
    case "lien_tuc_theo_thang":
      return "Liên tục / tháng";
    default:
      return loai;
  }
}

export function labelTrinhDoDauVao(trinhDo: TrinhDoDauVao): string {
  switch (trinhDo) {
    case "co_ban":
      return "Cơ bản";
    case "trung_cap":
      return "Trung cấp";
    case "nang_cao":
      return "Nâng cao";
    case "khong_yeu_cau":
      return "Không yêu cầu";
    default:
      return trinhDo;
  }
}

export function labelTrangThaiKhoaHoc(
  trangThai: TrangThaiKhoaHoc,
): { text: string; tone: "open" | "soon" | "pause" } {
  switch (trangThai) {
    case "dang_mo_don":
      return { text: "Đang mở đơn", tone: "open" };
    case "dang_hoc":
      return { text: "Đang học", tone: "open" };
    case "sap_khai_giang":
      return { text: "Sắp khai giảng", tone: "soon" };
    case "tam_dung":
      return { text: "Tạm dừng", tone: "pause" };
    case "da_ket_thuc":
      return { text: "Đã kết thúc", tone: "pause" };
    default:
      return { text: trangThai, tone: "soon" };
  }
}

export function isKhoaHocMuted(trangThai: TrangThaiKhoaHoc): boolean {
  return trangThai === "tam_dung" || trangThai === "da_ket_thuc";
}

export function formatThoiLuongKhoa(
  buoi: number | null,
  phutMoiBuoi?: number | null,
): string {
  if (buoi == null || buoi <= 0) return "—";
  const buoiLabel = `${buoi} buổi`;
  if (phutMoiBuoi == null || phutMoiBuoi <= 0) return buoiLabel;
  const hours = phutMoiBuoi / 60;
  const hLabel =
    Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1).replace(/\.0$/, "")}h`;
  return `${buoiLabel} · ${hLabel}`;
}

/** Nhãn khai giảng trên card (dẫn xuất từ lớp hoặc mô hình khóa). */
export function formatKhaiGiangCard(
  loaiMoHinh: LoaiMoHinhKhoa,
  ngayIso: string | null,
): string {
  if (ngayIso) {
    const [y, m, d] = ngayIso.split("-");
    if (y && m && d) return `Khai giảng ${d.padStart(2, "0")}.${m.padStart(2, "0")}`;
  }
  if (loaiMoHinh === "lien_tuc_theo_thang") return "Khai giảng hàng tuần";
  return "Chưa có lịch khai giảng";
}

export function formatKhoaHocPhi(
  hocPhi: number | null,
  loaiMoHinh: LoaiMoHinhKhoa,
): string {
  if (hocPhi == null) return "—";
  const suffix = loaiMoHinh === "lien_tuc_theo_thang" ? "/th" : "";
  if (hocPhi >= 1_000_000) {
    const tr = hocPhi / 1_000_000;
    const s = Number.isInteger(tr)
      ? String(tr)
      : tr.toFixed(1).replace(/\.0$/, "");
    return `${s} tr${suffix}`;
  }
  if (hocPhi >= 1_000) {
    const k = hocPhi / 1_000;
    const s = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(/\.0$/, "");
    return `${s}K${suffix}`;
  }
  return new Intl.NumberFormat("vi-VN").format(hocPhi);
}

export const TRINH_DO_OPTIONS: ReadonlyArray<{
  value: TrinhDoDauVao;
  label: string;
}> = [
  { value: "khong_yeu_cau", label: "Không yêu cầu" },
  { value: "co_ban", label: "Cơ bản" },
  { value: "trung_cap", label: "Trung cấp" },
  { value: "nang_cao", label: "Nâng cao" },
];

export const TRANG_THAI_KHOA_OPTIONS: ReadonlyArray<{
  value: TrangThaiKhoaHoc;
  label: string;
}> = [
  { value: "sap_khai_giang", label: "Sắp khai giảng" },
  { value: "dang_mo_don", label: "Đang mở đơn" },
  { value: "dang_hoc", label: "Đang học" },
  { value: "tam_dung", label: "Tạm dừng" },
  { value: "da_ket_thuc", label: "Đã kết thúc" },
];

export const LOAI_MO_HINH_OPTIONS: ReadonlyArray<{
  value: LoaiMoHinhKhoa;
  label: string;
  hint: string;
}> = [
  {
    value: "lien_tuc_theo_thang",
    label: "Liên tục / tháng",
    hint: "Học viên vào lớp theo khung thời gian linh hoạt.",
  },
  {
    value: "cohort_co_dinh",
    label: "Cohort cố định",
    hint: "Một lớp khai giảng, học xong khóa theo nhóm.",
  },
];

export function labelHinhThucLop(hinhThuc: HinhThucLop): string {
  switch (hinhThuc) {
    case "truc_tiep":
      return "Offline";
    case "truc_tuyen":
      return "Online";
    case "ket_hop":
      return "Kết hợp";
    default:
      return hinhThuc;
  }
}

export const HINH_THUC_LOP_OPTIONS: ReadonlyArray<{
  value: HinhThucLop;
  label: string;
  hint: string;
}> = [
  {
    value: "truc_tiep",
    label: "Offline",
    hint: "Học tại cơ sở — cần địa chỉ phòng học.",
  },
  {
    value: "truc_tuyen",
    label: "Online",
    hint: "Học trực tuyến qua Zoom / Google Meet.",
  },
  {
    value: "ket_hop",
    label: "Kết hợp",
    hint: "Một phần offline, một phần online.",
  },
];
