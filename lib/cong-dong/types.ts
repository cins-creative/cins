import type { GiaiDoan } from "@/lib/auth/session";
import type { CongDongCheDo } from "@/lib/cong-dong/constants";
import type { CongDongVaiTro } from "@/lib/cong-dong/vai-tro";
import type { OrgNotifyLevel } from "@/lib/social/org-notify";

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

export type CongDongAuthorBadge = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  ngheLabel: string | null;
  vaiTroLabel: string | null;
  verifiedCount: number;
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

export type CongDongPost = {
  id: string;
  tieuDe: string | null;
  noiDung: string;
  ghim: boolean;
  taoLuc: string;
  author: CongDongAuthorBadge;
  media: CongDongPostMedia[];
  filters: CongDongFilter[];
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
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
};
