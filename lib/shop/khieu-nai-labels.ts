/** Nhãn lý do khiếu nại — client-safe (không import server-only). */
export type ShopLyDoKhieuNaiClient =
  | "chua_giao"
  | "huy_khong_hoan"
  | "hang_sai"
  | "hang_loi"
  | "khac";

export const SHOP_LY_DO_KHIEU_NAI_LABEL: Record<
  ShopLyDoKhieuNaiClient,
  string
> = {
  chua_giao: "Chưa nhận hàng",
  huy_khong_hoan: "Hủy / không hoàn tiền",
  hang_sai: "Hàng sai mô tả",
  hang_loi: "Hàng lỗi",
  khac: "Khác",
};
