/** Ảnh ví dụ cho icon ? từng bước form /mo-shop. */

export type MoShopSectionHelpImage = {
  src: string;
  alt: string;
};

export const MO_SHOP_SECTION_HELP: Partial<
  Record<number, MoShopSectionHelpImage>
> = {
  1: {
    src: "/mo-shop/help/step-1-ten-shop.png?v=2",
    alt: "Ví dụ banner, avatar, tên shop và mô tả trên trang shop CINs",
  },
  3: {
    src: "/mo-shop/help/step-3-mat-hang.png",
    alt: "Ví dụ các mặt hàng phổ biến: tên, mô tả, số mẫu và giá trên trang shop",
  },
  4: {
    src: "/mo-shop/help/step-4-stk-nhan-tien.png",
    alt: "Ví dụ màn hình thanh toán: STK, chủ TK, nội dung chuyển khoản và QR trên shop CINs",
  },
};
