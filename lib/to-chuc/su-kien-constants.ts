export const LOAI_SU_KIEN_VALUES = [
  "workshop",
  "talkshow",
  "trien_lam",
  "le_hoi",
  "contest",
  "meetup",
  "khoa_dao_tao_ngan",
  "tour_cong_ty",
  "tour_truong",
  "open_day",
  "screening",
  "hackathon",
  "career_fair",
] as const;

export type LoaiSuKien = (typeof LOAI_SU_KIEN_VALUES)[number];

export const LOAI_SU_KIEN_LABELS: Record<LoaiSuKien, string> = {
  workshop: "Workshop",
  talkshow: "Talkshow",
  trien_lam: "Triển lãm",
  le_hoi: "Lễ hội",
  contest: "Cuộc thi",
  meetup: "Meetup",
  khoa_dao_tao_ngan: "Khóa đào tạo ngắn",
  tour_cong_ty: "Tour công ty",
  tour_truong: "Tour trường",
  open_day: "Open day",
  screening: "Screening",
  hackathon: "Hackathon",
  career_fair: "Ngày hội việc làm",
};

const LOAI_SU_KIEN_SET = new Set<string>(LOAI_SU_KIEN_VALUES);

export function isLoaiSuKien(value: unknown): value is LoaiSuKien {
  return typeof value === "string" && LOAI_SU_KIEN_SET.has(value);
}

export function labelLoaiSuKien(value: string | null | undefined): string {
  if (value && isLoaiSuKien(value)) return LOAI_SU_KIEN_LABELS[value];
  return "Sự kiện";
}

export type SuKienCardData = {
  id: string;
  ten: string;
  loaiSuKien: LoaiSuKien;
  /** Tóm tắt ngắn — card / timeline. */
  moTa: string | null;
  /** Nội dung chi tiết HTML (Tiptap). */
  noiDung: string | null;
  coverId: string | null;
  coverSrc: string | null;
  batDau: string;
  ketThuc: string | null;
  /** Khu vực — mã `tinh_thanh_vn_enum`. */
  tinhThanh: string | null;
  /** Địa chỉ chi tiết hoặc link online. */
  diaDiem: string | null;
  mienPhi: boolean;
  giaVe: number | null;
  slotToiDa: number | null;
  soDangKy: number;
};

export type TaoSuKienInput = {
  ten: string;
  loaiSuKien: string;
  moTa?: string | null;
  noiDung?: string | null;
  batDau: string;
  ketThuc?: string | null;
  tinhThanh?: string | null;
  diaDiem?: string | null;
  mienPhi?: boolean;
  giaVe?: number | null;
  slotToiDa?: number | null;
  coverId?: string | null;
};

export function labelSuKienVe(
  mienPhi: boolean,
  giaVe: number | null | undefined,
): string {
  if (mienPhi) return "Miễn phí";
  if (typeof giaVe === "number" && giaVe > 0) {
    return `${new Intl.NumberFormat("vi-VN").format(giaVe)} đ`;
  }
  return "Tính phí";
}

export type CapNhatSuKienInput = Partial<TaoSuKienInput>;
