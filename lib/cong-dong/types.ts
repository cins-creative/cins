import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import type { GiaiDoan } from "@/lib/auth/session";
import type { CongDongCheDo } from "@/lib/cong-dong/constants";
import type { CongDongVaiTro } from "@/lib/cong-dong/vai-tro";
import type { OrgNotifyLevel } from "@/lib/social/org-notify";
import type { Block } from "@/lib/editor/types";
import type { ArticleTagRef } from "@/lib/editor/article-tag";

export type CongDongTrangThaiTinCay =
  | "binh_thuong"
  | "dang_review"
  | "bi_canh_bao"
  | "bi_cam"
  | "verified_official";

export type CongDongOrg = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
  tinhThanh: string | null;
  avatarId: string | null;
  coverId: string | null;
  cheDo: CongDongCheDo;
  trangThaiTinCay: CongDongTrangThaiTinCay;
  soThanhVien: number;
  soBaiViet: number;
};

export type CongDongCareerSegment = {
  stage: GiaiDoan;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type CongDongEvent = {
  id: string;
  tieuDe: string;
  moTa: string | null;
  coverId: string | null;
  batDau: string;
  ketThuc: string | null;
  diaDiem: string | null;
  loaiLabel: string | null;
};

export type CongDongEventRailBanner = {
  coverId: string | null;
  tieuDe: string;
  moTa: string | null;
};

export type CongDongEventRailScheduled = CongDongEventRailBanner & {
  id: string;
  batDau: string;
  ketThuc: string;
};

export type CongDongEventRailHistoryItem = CongDongEventRailScheduled & {
  luuLuc: string;
};

export type CongDongEventRailConfig = {
  macDinh: CongDongEventRailBanner;
  dangChay: CongDongEventRailScheduled | null;
  lichSu: CongDongEventRailHistoryItem[];
};

export type CongDongEventRailDisplay = CongDongEventRailBanner & {
  source: "default" | "scheduled";
  batDau: string | null;
  ketThuc: string | null;
};

export type CongDongEventRailState = {
  config: CongDongEventRailConfig;
  display: CongDongEventRailDisplay;
};

export type CongDongPulseItem =
  | {
      kind: "milestone";
      userName: string;
      userSlug: string;
      milestoneTitle: string;
      taoLuc: string;
    }
  | {
      kind: "join";
      userName: string;
      userSlug: string;
      taoLuc: string;
    };

export type CongDongMemberPreview = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  initial: string;
};

export type CongDongMemberAdmin = {
  id: string;
  userId: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  vaiTro: CongDongVaiTro;
  editable: boolean;
  ngheLabel: string | null;
  soBaiVietTrongNhom: number;
  baiVietGanNhatLuc: string | null;
};

export type CongDongAuthorBadge = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  ngheLabel: string | null;
  vaiTroLabel: string | null;
  verifiedCount: number;
  soBaiVietTrongNhom: number;
};

export type CongDongPostMedia = {
  id: string;
  cloudflareId: string;
  thuTu: number;
};

export type CongDongFilter = {
  id: string;
  ten: string;
  slug: string;
  mau: string;
  icon: string | null;
  thuTu: number;
};

/** Bài nghề hoặc ngành đào tạo gắn với nhóm — tối đa 4, lưu `org_to_chuc.cau_hinh.danh_muc`. */
export type CongDongCategory = {
  id: string;
  slug: string;
  tieuDe: string;
  loaiBaiViet: "nghe" | "nganh_dao_tao";
  /** `article_bai_viet.tom_tat` — tooltip sidebar. */
  tomTat?: string | null;
  /** Fallback mô tả khi `tom_tat` trống. */
  metaDescription?: string | null;
  /** URL thumbnail đã resolve — tooltip sidebar. */
  thumbUrl?: string | null;
  /** Raw CF — fallback resolve trên client. */
  coverId?: string | null;
  thumbnail?: string | null;
  /** `article_bai_viet.id_linh_vuc` → `linh_vuc.ten` (nghề thường có; ngành có thể null). */
  linhVucTen?: string | null;
  linhVucSlug?: string | null;
};

/** Cấu hình compose trên trang cộng đồng — thay visibility bằng chọn nhãn loại bài. */
export type CongDongComposeConfig = {
  orgId: string;
  filters: CongDongFilter[];
};

/** Tác phẩm Journey gắn với post cộng đồng — render card giống timeline. */
export type CongDongJourneyMirror = {
  tacPhamId: string;
  /** `content_tac_pham_thuoc_moc.id_cot_moc` — dùng lưu về Journey. */
  milestoneId: string | null;
  postSlug: string;
  /** Slug chủ `content_tac_pham` — permalink `/owner/p/slug`. */
  ownerSlug: string;
  tieuDe: string;
  moTa: string | null;
  coverId: string | null;
  noiDungBlocks: Block[];
  /** Preview card — cùng logic `milestonePreviewMedia` trên timeline. */
  previewMedia: MilestoneMediaItem | null;
  articleTags: ArticleTagRef[];
};

export type CongDongPost = {
  id: string;
  tieuDe: string | null;
  noiDung: string;
  ghim: boolean;
  /** Ngày cột mốc (`content_cot_moc.thoi_diem`) — sort + hiển thị, khớp Journey. */
  thoiDiem: string;
  /** Thời điểm tạo record — tiebreak khi cùng `thoiDiem`. */
  taoLuc: string;
  author: CongDongAuthorBadge;
  media: CongDongPostMedia[];
  filters: CongDongFilter[];
  journeyMirror: CongDongJourneyMirror | null;
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerBookmarked: boolean;
};

export type CongDongComment = {
  id: string;
  noiDung: string;
  taoLuc: string;
  author: {
    id: string;
    slug: string;
    tenHienThi: string;
    avatarId: string | null;
  };
};

export type CongDongPageData = {
  org: CongDongOrg;
  isThanhVien: boolean;
  isAdmin: boolean;
  viewerVaiTro: CongDongVaiTro | null;
  hideMembershipForOwner: boolean;
  notifyLevel: OrgNotifyLevel;
  viewerId: string | null;
  viewerSlug: string | null;
  viewerName: string | null;
  viewerAvatarId: string | null;
  filters: CongDongFilter[];
  initialPosts: CongDongPost[];
  nextCursor: string | null;
  communityPulse: CongDongPulseItem[];
  eventRail: CongDongEventRailState;
  categories: CongDongCategory[];
};
