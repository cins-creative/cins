/** Loại báo cáo — khớp `loai_bao_cao_enum` (migration_social_bao_cao.sql). */
export const LOAI_BAO_CAO_OPTIONS = [
  {
    value: "spam",
    label: "Spam / quảng cáo",
    desc: "Quảng cáo, link rác, nội dung lặp lại.",
  },
  {
    value: "phan_cam",
    label: "Nội dung phản cảm",
    desc: "Khiêu dâm, bạo lực, gây sốc.",
  },
  {
    value: "quay_roi",
    label: "Quấy rối / bắt nạt",
    desc: "Công kích, đe doạ, xúc phạm cá nhân.",
  },
  {
    value: "sai_lech",
    label: "Thông tin sai / lừa đảo",
    desc: "Tin giả, lừa đảo, mạo nhận thành tích.",
  },
  {
    value: "ban_quyen",
    label: "Vi phạm bản quyền",
    desc: "Dùng tác phẩm của người khác trái phép.",
  },
  {
    value: "mao_danh",
    label: "Mạo danh",
    desc: "Giả mạo người / tổ chức khác.",
  },
  {
    value: "khac",
    label: "Khác",
    desc: "Lý do khác — mô tả bên dưới.",
  },
] as const;

export type LoaiBaoCao = (typeof LOAI_BAO_CAO_OPTIONS)[number]["value"];

export const LOAI_BAO_CAO_SET = new Set<string>(
  LOAI_BAO_CAO_OPTIONS.map((o) => o.value),
);

export function labelLoaiBaoCao(value: string | null | undefined): string {
  const hit = LOAI_BAO_CAO_OPTIONS.find((o) => o.value === value);
  return hit?.label ?? (value ?? "").replace(/_/g, " ");
}

export type TrangThaiBaoCao = "moi" | "dang_xu_ly" | "da_xu_ly" | "bo_qua";

export const TRANG_THAI_BAO_CAO_LABEL: Record<TrangThaiBaoCao, string> = {
  moi: "Mới",
  dang_xu_ly: "Đang xử lý",
  da_xu_ly: "Đã xử lý",
  bo_qua: "Bỏ qua",
};

/** Kết quả xử lý gợi ý — admin chọn nhanh, ghi vào thông báo cho người báo cáo. */
export const KET_QUA_XU_LY_OPTIONS = [
  { value: "go_noi_dung", label: "Đã gỡ nội dung vi phạm" },
  { value: "canh_cao", label: "Đã cảnh cáo người đăng" },
  { value: "khong_vi_pham", label: "Nội dung không vi phạm" },
] as const;
