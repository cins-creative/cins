import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block as ServerBlock } from "@/lib/editor/types";
import type { PersonalFilterRef } from "@/lib/filter/types";
import type { BookmarkFrameKind } from "@/lib/journey/bookmark-source-theme";

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
 *   • `unlisted`  ↔ `theo_nhom`  — Bạn bè (chỉ bạn bè mới xem)
 *   • `private`   ↔ `chi_minh`   — Chỉ mình tôi
 */
export type MilestoneVisibility =
  | "feature"
  | "public"
  | "unlisted"
  | "private"
  /** Post trong feed cộng đồng — ẩn Journey public, chỉ owner thấy badge. */
  | "cong-dong";

/** Credit strip — tác giả accepted + pending trên tác phẩm. */
export type CoAuthorCredit = {
  /** UUID người dùng — dùng cho trạng thái kết bạn trên author row. */
  idNguoiDung?: string;
  name: string;
  role?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
  initial?: string | null;
  laChuSoHuu?: boolean;
  trangThai?: "pending" | "accepted";
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
  orgKind?: "cong_dong" | "truong" | "co_so_dao_tao" | "studio" | null;
  /** URL trang công khai của org. */
  href?: string | null;
  /** Cover org (cộng đồng / trường) — Cloudflare delivery URL. */
  coverUrl?: string | null;
  /** Số thành viên — chỉ `orgKind === 'cong_dong'`. */
  memberCount?: number;
  /** Số bài thảo luận trong cộng đồng. */
  postCount?: number;
};

/** Một người bạn "sẽ tham gia" sự kiện — chip avatar + popup danh sách trên feed. */
export type FeedFriendAttendee = {
  /** UUID người dùng. */
  id: string;
  /** Tên hiển thị (fallback slug). */
  name: string;
  /** Slug trang cá nhân → link `/{slug}`. */
  slug: string;
  /** Avatar Cloudflare (null → dùng chữ cái đầu). */
  avatarUrl?: string | null;
  /** 1 chữ cái khi không có avatar. */
  initial?: string | null;
};

export type MilestoneCongDongOrg = {
  orgId: string;
  name: string;
  slug: string;
  href: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  initial?: string | null;
};

/** Layout card đặc biệt — khác article/photo/video. */
export type MilestoneCardLayout =
  | "default"
  | "cong-dong-create"
  | "co-so-create"
  | "studio-create"
  | "identity-pending"
  | "identity-verified";

/** Cột mốc danh tính chờ org duyệt (`membership_milestone_v1`). */
export type MembershipPendingMeta = {
  requestId: string;
  submittedAt: string;
  orgTen: string;
  orgSlug: string;
  orgLoai: "truong_dai_hoc" | "co_so_dao_tao" | "studio";
  orgAvatarUrl: string | null;
  orgHref: string | null;
  visibilityAfterVerify: "public" | "theo_nhom" | "chi_minh";
};

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
  /** Màu khung ngoài — `loai_to_chuc` org hoặc `user` / `cong_dong`. */
  sourceKind?: BookmarkFrameKind | null;
};

/** Card «Lưu về» — tin tuyển dụng / khóa học (không dùng layout bài viết). */
export type MilestoneBookmarkListingKind = "tuyen_dung" | "khoa_hoc";

export type MilestoneBookmarkListingStatusTone =
  | "open"
  | "closed"
  | "expired"
  | "draft";

export type MilestoneBookmarkListing = {
  kind: MilestoneBookmarkListingKind;
  href: string;
  orgTen: string;
  orgAvatarUrl?: string | null;
  snippet?: string | null;
  /** Tuyển dụng */
  salary?: string | null;
  loaiHinhLabel?: string | null;
  place?: string | null;
  linhVucTen?: string | null;
  statusLabel?: string | null;
  statusTone?: MilestoneBookmarkListingStatusTone;
  deadline?: string | null;
  /** Khóa học */
  coverUrl?: string | null;
  hocPhi?: string | null;
  trinhDoLabel?: string | null;
};

/** Bookmark từ `org_bai_dang` — unfold blocks local, không gọi Journey post API. */
export type MilestoneOrgBaiDangRef = {
  postId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
};

/** Sự kiện org (`org_su_kien`) trên World Journey feed — không có `content_cot_moc`. */
export type MilestoneOrgSuKienRef = {
  suKienId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLoai: string;
  href: string;
  batDau: string;
  ketThuc?: string | null;
  loaiSuKien: string | null;
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
   * Bookmark: thời điểm lưu (`social_luu.tao_luc`) — sort trong cùng ngày lịch.
   */
  createdAt?: string | null;
  /** Bookmark — `social_luu.tao_luc`; hiển thị trên via-bar «Lưu về». */
  bookmarkSavedAt?: string | null;

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
  /** UUID chủ bài viết — dùng loại trừ khi đề xuất cộng sự trên card tagged. */
  postOwnerId?: string | null;
  /** UUID tác phẩm chính, dùng cho các action cộng sự. */
  tacPhamId?: string | null;
  /** Slug nhãn cá nhân (`filter_nhan`) gắn trên cột mốc — lọc cục bộ Journey. */
  personalFilterSlugs?: string[];
  /** Metadata nhãn (ten, mau) — hydrate server-side để badge hiển thị cho mọi viewer. */
  personalFilters?: PersonalFilterRef[];
  /** Viewer là cộng sự đã được duyệt và có thể đề xuất thêm người. */
  canProposeCoAuthor?: boolean;

  /** Khi `variant === 'tagged' | 'verified'` — ai tag/verify. */
  attribution?: MilestoneAttribution | null;
  /** Khi `variant === 'bookmark'` — bookmark từ đâu. */
  bookmark?: MilestoneBookmarkSource | null;
  /** Bookmark tin tuyển dụng / khóa học — card chuyên biệt thay vì text panel. */
  bookmarkListing?: MilestoneBookmarkListing | null;
  /** Bài đăng trường/org đã lưu — render unfold từ `noiDungBlocks`. */
  orgBaiDangRef?: MilestoneOrgBaiDangRef | null;
  /** Sự kiện org trên feed giữa — card riêng, link sang trang org. */
  orgSuKienRef?: MilestoneOrgSuKienRef | null;
  /** Nhãn gợi ý (social graph) — hiển thị trên card feed. */
  feedSuggestion?: boolean;
  /** Dòng social hint — vd. "3 bạn bè sẽ tham gia". */
  feedSocialHint?: string | null;
  /** Bạn bè "sẽ tham gia" sự kiện — chip avatar + popup danh sách. */
  feedFriends?: FeedFriendAttendee[];
  /** Badge "✓ Sine Art" — chỉ khi đã được verified. */
  verifiedBy?: string | null;

  /**
   * World Journey feed — số lần viewer đã "tiếp cận" (`hien_thi`) nội dung này.
   * 0/undefined = chưa xem. Dùng để ưu tiên nội dung chưa xem / xem ít lên trên
   * khi sắp xếp trong mỗi năm (không ảnh hưởng Journey cá nhân).
   */
  viewerSeenCount?: number | null;

  /**
   * World Journey feed — bài/sự kiện org từ tổ chức viewer đang theo dõi
   * (ưu tiên xếp trên bài org chưa follow).
   */
  feedOrgFollowed?: boolean;

  /** World Journey — bài từ pool Khám phá (chưa theo dõi), dùng sort «Theo dõi». */
  feedExplore?: boolean;

  /**
   * Thời điểm xếp trên World Journey feed — sự kiện org tương lai dùng thay cho
   * `bat_dau` (badge vẫn hiện ngày sự kiện).
   */
  feedSortAt?: string | null;

  /** Card layout — `cong-dong-create` = milestone tạo cộng đồng (logo org). */
  cardLayout?: MilestoneCardLayout;
  /** Cột mốc danh tính chờ org duyệt — chỉ owner thấy (`chi_minh`). */
  membershipPending?: MembershipPendingMeta | null;
  /** Link cộng đồng/org khi `cardLayout === 'cong-dong-create'`. */
  orgHref?: string | null;

  /** Cột mốc đăng vào feed cộng đồng (`che_do_hien_thi=cong_dong`). */
  congDongOrg?: MilestoneCongDongOrg | null;

  /** Trang entity — chủ cột mốc khi aggregate nhiều Journey. */
  lensOwnerId?: string | null;
  lensOwnerSlug?: string | null;
  lensOwnerName?: string | null;
  lensOwnerAvatarUrl?: string | null;

  /** Media tối đa 3 thumbnail trên grid (single/double/triple). */
  media?: MilestoneMediaItem[];
  /** `content_tac_pham.cover_id` — dùng classify grid (Phase 3). */
  tacPhamCoverId?: string | null;
  /** `content_tac_pham.mo_ta` — classify grid chính xác hơn `body` (cột mốc). */
  tacPhamMoTa?: string | null;

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
