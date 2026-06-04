/** Polymorphic follow target — khớp `user_theo_doi.loai_doi_tuong`. */
export type FollowTargetType = "user" | "tag" | "org";

export type TacGiaTrangThai = "pending" | "accepted" | "declined";

export type CoAuthorDraft = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string;
  avatarId?: string | null;
  vaiTro: string;
};

export type CoAuthorPersisted = CoAuthorDraft & {
  trangThai: TacGiaTrangThai;
  laChuSoHuu: boolean;
};

export type PendingCoAuthorInvite = {
  tacPhamId: string;
  postSlug: string;
  postTitle: string;
  ownerSlug: string;
  ownerName: string;
  vaiTro: string;
};

export type PendingFollowRequest = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  giaiDoan: string | null;
  tinhThanh: string | null;
  stats: {
    cotMoc: number;
    tacPham: number;
    banBe: number;
    toChucXacThuc: number;
  };
};

export type MutualFriendProfile = PendingFollowRequest;

export type FollowAcceptedNotification = PendingFollowRequest & {
  notificationId: string;
};

export type CommentNotification = PendingFollowRequest & {
  notificationId: string;
  milestoneId: string;
  postTitle: string;
  postSlug: string | null;
  ownerSlug: string | null;
};

export type CoAuthorReviewProfile = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
};

export type PendingCoAuthorReview = {
  notificationId: string;
  tacPhamId: string;
  postTitle: string;
  postSlug: string;
  ownerSlug: string;
  vaiTro: string;
  proposer: CoAuthorReviewProfile;
  target: CoAuthorReviewProfile;
};
