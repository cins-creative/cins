import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block as ServerBlock } from "@/lib/editor/types";

/**
 * Type chuẩn cho 1 cột mốc (milestone) trên Journey.
 *
 * Hiện DB chưa có schema `content_cot_moc` ổn định → các trang dùng kiểu này
 * như interface mong đợi. Khi backend cố định, sửa adapter ở `lib/journey/*`
 * thay vì đụng UI component.
 *
 * Thuật ngữ trên UI:
 *   - `variant`: cách cột mốc xuất hiện → quyết định màu diamond, viền card,
 *     attribution panel.
 *       • `self`     — owner tự up (chưa verified)
 *       • `tagged`   — tổ chức / cá nhân tag user vào (chưa verified)
 *       • `verified` — đã được tổ chức xác nhận (rim xanh quanh diamond)
 *       • `bookmark` — user lưu nội dung từ nguồn ngoài
 *   - `type`: nhóm nội dung → quyết định màu badge.
 */

export type MilestoneVariant = "self" | "tagged" | "verified" | "bookmark";

export type MilestoneType =
  | "hoc"
  | "lam"
  | "du-an"
  | "su-kien"
  | "thanh-tuu"
  | "ca-nhan"
  | "bookmark";

/**
 * Chế độ hiển thị (UI value) — map 1-1 sang enum DB `che_do_hien_thi_moc_enum`:
 *   • `feature`   ↔ `feature`    — Nổi bật (ghim đầu Journey)
 *   • `public`    ↔ `public`     — Công khai
 *   • `unlisted`  ↔ `theo_nhom`  — Theo nhóm (chỉ ai có link/nhóm mới xem)
 *   • `private`   ↔ `chi_minh`   — Chỉ mình tôi
 */
export type MilestoneVisibility =
  | "feature"
  | "public"
  | "unlisted"
  | "private";

/** Credit strip — mọi tác giả `accepted` trên tác phẩm. */
export type CoAuthorCredit = {
  name: string;
  role?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
  initial?: string | null;
  laChuSoHuu?: boolean;
};

export type MilestoneAttribution = {
  /** Tên tổ chức/cá nhân tag — VD "Sine Art", "Antiantiart Studio". */
  name: string;
  /** Vai trò mô tả ngắn — VD "Founder", "co-author", "Speaker". */
  role?: string | null;
  /** Avatar người/tổ chức tag user. */
  avatarUrl?: string | null;
  /** 1 chữ avatar khi không có ảnh. */
  initial?: string | null;
  /** Slug để link sang trang org (chưa wire). */
  slug?: string | null;
  /** Có phải là organization (vuông) hay person (tròn). */
  isOrg?: boolean;
  /** Loại org — quyết định popover + link. */
  orgKind?: "cong_dong" | "truong" | null;
  /** URL trang công khai của org. */
  href?: string | null;
  /** Cover org (cộng đồng / trường) — Cloudflare delivery URL. */
  coverUrl?: string | null;
  /** Số thành viên — chỉ `orgKind === 'cong_dong'`. */
  memberCount?: number;
  /** Số bài thảo luận trong cộng đồng. */
  postCount?: number;
};

/** Layout card đặc biệt — khác article/photo/video. */
export type MilestoneCardLayout = "default" | "cong-dong-create";

export type MilestoneBookmarkSource = {
  /** Tên platform — "ArtStation", "Behance", "YouTube"… */
  name: string;
  /** Domain hiển thị nhỏ ở footer panel. */
  domain: string;
  /** URL gốc (có thể null nếu chưa biết). */
  url?: string | null;
  /** 1 chữ icon. */
  initial?: string | null;
  avatarUrl?: string | null;
};

export type MilestoneMediaItem = {
  /** URL ảnh (Cloudflare imagedelivery hoặc legacy picsum). */
  src: string;
  /** Responsive srcset — Cloudflare variants (thumbnail / medium / public). */
  srcSet?: string;
  /** Intrinsic width — chống CLS. */
  width?: number;
  /** Intrinsic height — chống CLS. */
  height?: number;
  /** Caption ngắn (in góc dưới-trái thumbnail). */
  label?: string | null;
  /** Có overlay play icon (video) hay không. */
  isVideo?: boolean;
};

export type MilestoneItem = {
  /** UUID hoặc slug nội bộ — dùng làm key React + data-mid cho overlay. */
  id: string;
  /** UUID thật của `content_cot_moc`, dùng cho action DB như bookmark/comment. */
  cotMocId?: string | null;

  /** Hiển thị: variant + content type + visibility. */
  variant: MilestoneVariant;
  type: MilestoneType;
  visibility?: MilestoneVisibility;

  /** Thời gian xảy ra — năm + tháng (1..12) + ngày (1..31). */
  year: number;
  month: number;
  day: number;

  /**
   * Thời điểm tạo record (`content_cot_moc.tao_luc`, ISO string) — dùng để
   * tiebreak khi 2 milestone cùng `thoi_diem` (cùng ngày). Mới hơn lên trên.
   */
  createdAt?: string | null;

  /** Tiêu đề chính (Fraunces, lớn). */
  title: string;
  /** Dòng "org" mô tả vai trò + tổ chức (tuỳ chọn). */
  org?: string | null;
  /** Body ngắn — 1-3 câu. */
  body?: string | null;

  /**
   * Slug của bài viết (`content_tac_pham.slug`) liên kết — dùng để dựng URL
   * `/{ownerSlug}/p/{postSlug}/edit` cho menu owner "Sửa bài viết".
   * Có thể null khi cột mốc chưa có tác phẩm gắn vào.
   */
  postSlug?: string | null;
  /** Slug chủ bài viết thật. Khác owner Journey khi đây là post được tag qua. */
  postOwnerSlug?: string | null;
  /** UUID tác phẩm chính, dùng cho các action cộng sự. */
  tacPhamId?: string | null;
  /** Viewer là cộng sự đã được duyệt và có thể đề xuất thêm người. */
  canProposeCoAuthor?: boolean;

  /** Khi `variant === 'tagged' | 'verified'` — ai tag/verify. */
  attribution?: MilestoneAttribution | null;
  /** Khi `variant === 'bookmark'` — bookmark từ đâu. */
  bookmark?: MilestoneBookmarkSource | null;
  /** Badge "✓ Sine Art" — chỉ khi đã được verified. */
  verifiedBy?: string | null;

  /** Card layout — `cong-dong-create` = milestone tạo cộng đồng (logo org). */
  cardLayout?: MilestoneCardLayout;
  /** Link cộng đồng/org khi `cardLayout === 'cong-dong-create'`. */
  orgHref?: string | null;

  /** Media tối đa 3 thumbnail trên grid (single/double/triple). */
  media?: MilestoneMediaItem[];

  /**
   * Canonical block array của tác phẩm chính (`content_tac_pham.noi_dung_
   * blocks`) — dùng để render nội dung INLINE trên card (giống image #3
   * brief). KHÔNG render `cover_id` ở đây — cover dành cho Gallery thumb.
   *
   * Null = card chỉ hiển thị title + body fallback.
   */
  noiDungBlocks?: ServerBlock[] | null;

  /** Tags hệ thống (#concept-art) hoặc free (#side-project). */
  tags?: ReadonlyArray<{ label: string; isSystem?: boolean }>;

  /**
   * Article tags — bài viết `article_bai_viet` được tác giả gắn vào tác phẩm
   * chính của cột mốc (qua `article_gan_tac_pham`). Render trên card Journey
   * dưới dạng pill màu theo `loai_bai_viet`, click vào → trang article tương
   * ứng (`articlePublicHref`).
   */
  articleTags?: ReadonlyArray<ArticleTagRef>;

  /** Dải credit đồng tác giả (accepted) dưới nội dung card. */
  coAuthorCredits?: ReadonlyArray<CoAuthorCredit>;

  /** Số views + comments (footer). Bỏ trống → ẩn footer. */
  views?: number | null;
  comments?: number | null;
  social?: {
    viewerLiked: boolean;
    viewerBookmarked: boolean;
    likeCount: number;
    bookmarkCount: number;
    showCounts: boolean;
  };
};
