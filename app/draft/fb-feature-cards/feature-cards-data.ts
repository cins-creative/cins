export type FbFeatureCardData = {
  id: string;
  /** Nhãn nhỏ góc — vd. "Shop cho Artist" */
  kicker: string;
  /** Cụm cần highlight lớn nhất — vd. "Phí sàn 0%" */
  highlight: string;
  subtitle: string;
  /** Điểm phụ */
  tags: string[];
  image?: string;
  imageAlt?: string;
  /** Gom nhiều ảnh brief trong 1 card */
  images?: { src: string; alt: string }[];
  icon?: string;
};

/** Bộ ảnh Shop cho Artist — brief từ user. */
export const FB_FEATURE_CARDS: FbFeatureCardData[] = [
  {
    id: "shop-artist-zero-fee",
    kicker: "Shop cho Artist",
    highlight: "Phí sàn 0%",
    subtitle: "Cửa hàng gắn thẳng vào profile CINs",
    tags: ["Doanh thu về tay bạn", "Không cut commission"],
    image: "/nhap/fb-feature-cards/shop-overview.png",
    imageAlt: "Cửa hàng Basakila trên CINs — lưới sản phẩm merch",
  },
  {
    id: "shop-artist-merch",
    kicker: "Bán merch trên CINs",
    highlight: "Mở shop 5 phút",
    subtitle: "Biến thể · giá · giỏ hàng — không cần web riêng",
    tags: ["Charm", "Standee", "Acrylic", "In ấn"],
    image: "/nhap/fb-feature-cards/shop-product.png",
    imageAlt: "Trang sản phẩm charm Basakila trên CINs",
  },
  {
    id: "shop-direct-transfer",
    kicker: "Thanh toán Shop",
    highlight: "CK thẳng STK bạn",
    subtitle: "Khách chuyển tiền trực tiếp — không qua trung gian",
    tags: ["QR · STK · nội dung CK", "Combo · voucher · biên lai"],
    image: "/nhap/fb-feature-cards/shop-checkout.png",
    imageAlt: "Modal thanh toán chuyển khoản trực tiếp trên CINs",
  },
  {
    id: "kho-san-pham",
    kicker: "Quản lý kho hàng",
    highlight: "Sản phẩm & tồn kho",
    subtitle: "Hệ thống quản lý kho hàng đầy đủ trên CINs",
    tags: ["Biến thể · giá", "Ảnh & video", "Danh mục · fandom · chất liệu"],
    image: "/nhap/fb-feature-cards/kho-san-pham.png",
    imageAlt: "Quản lý sản phẩm, biến thể và tồn kho trên CINs",
  },
  {
    id: "kho-don-hang",
    kicker: "Quản lý kho hàng",
    highlight: "Đơn hàng & vận chuyển",
    subtitle: "Hệ thống quản lý kho hàng đầy đủ trên CINs",
    tags: ["Trạng thái đơn", "ĐVVC · mã vận đơn", "Xuất Excel · CSV"],
    image: "/nhap/fb-feature-cards/kho-don-hang.png",
    imageAlt: "Quản lý đơn hàng và vận chuyển trên CINs",
  },
  {
    id: "combo-voucher",
    kicker: "Combo & Voucher",
    highlight: "Voucher & Combo",
    subtitle: "Tạo voucher & combo để thu hút khách hàng",
    tags: ["Combo tự trừ khi đủ bộ", "Voucher toàn shop", "Không cần nhập mã"],
    images: [
      {
        src: "/nhap/fb-feature-cards/combo-discount.png",
        alt: "Tạo combo giảm giá khi khách mua đủ tổ hợp",
      },
      {
        src: "/nhap/fb-feature-cards/voucher-shop.png",
        alt: "Voucher toàn shop trên CINs",
      },
    ],
  },
  {
    id: "shop-chat",
    kicker: "Tin nhắn Shop",
    highlight: "Nhắn tin tự do",
    subtitle: "Trao đổi trực tiếp với khách hàng — không ràng buộc",
    tags: ["Chat ngay trên shop", "Context đơn hàng", "Không qua trung gian"],
    image: "/nhap/fb-feature-cards/shop-chat.png",
    imageAlt: "Chat trực tiếp với khách hàng trên CINs Shop",
  },
  {
    id: "timeline-shop",
    kicker: "Timeline Shop",
    highlight: "Gắn giỏ hàng",
    subtitle: "Gắn giỏ hàng vào bài đăng timeline — tăng tiếp cận khách hàng",
    tags: ["Bài đăng + sản phẩm", "Khách mua ngay trên feed", "Feature post nổi bật"],
    image: "/nhap/fb-feature-cards/timeline-shop.png",
    imageAlt: "Bài đăng timeline Basakila gắn sản phẩm shop trên CINs",
  },
  {
    id: "shop-marketplace",
    kicker: "Cộng đồng Shop",
    highlight: "Gặp gỡ một nơi",
    subtitle: "Mọi người gặp gỡ nhau tại 1 nơi — khám phá shop artist",
    tags: ["Chợ shop CINs", "Voucher · combo · merch", "Artist Việt cùng sân chơi"],
    image: "/nhap/fb-feature-cards/shop-marketplace.png",
    imageAlt: "Trang khám phá shop artist trên CINs",
  },
  {
    id: "su-kien-shop",
    kicker: "Trang sự kiện",
    highlight: "Pre-order sớm",
    subtitle: "Gặp gỡ, mua hàng, pre-order sớm tại trang sự kiện",
    tags: ["Quầy shop trên event", "Khách đặt trước online", "Gặp gỡ tại Color Fiesta"],
    image: "/nhap/fb-feature-cards/su-kien-shop.png",
    imageAlt: "Trang sự kiện Color Fiesta với quầy shop artist trên CINs",
  },
];
