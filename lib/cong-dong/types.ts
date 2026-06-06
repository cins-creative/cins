import type { CongDongCheDo } from "@/lib/cong-dong/constants";

export type CongDongOrg = {
  id: string;
  slug: string;
  ten: string;
  moTa: string | null;
  tinhThanh: string | null;
  avatarId: string | null;
  coverId: string | null;
  cheDo: CongDongCheDo;
  soThanhVien: number;
};

export type CongDongAuthorBadge = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  ngheLabel: string | null;
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
  viewerId: string | null;
  filters: CongDongFilter[];
  initialPosts: CongDongPost[];
  nextCursor: string | null;
};
