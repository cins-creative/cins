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
  ownerAvatarUrl: string | null;
  vaiTro: string;
};

/** Lời mời cộng sự từ `social_thong_bao` (`tac_gia_invite`). */
export type PendingCoAuthorInviteNotification = PendingCoAuthorInvite & {
  notificationId: string;
  taoLuc?: string;
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
  /** Record `user_ket_ban` — dùng cho accept/decline API. */
  ketBanId?: string;
};

/** Quan hệ kết bạn từ góc nhìn viewer → target. */
export type QuanHe =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked";

export type MutualFriendProfile = PendingFollowRequest;

export type FollowAcceptedNotification = PendingFollowRequest & {
  notificationId: string;
  taoLuc?: string;
  daDoc?: boolean;
};

export type CommentNotification = PendingFollowRequest & {
  notificationId: string;
  milestoneId: string;
  postTitle: string;
  postSlug: string | null;
  ownerSlug: string | null;
  /** Số bình luận gộp từ cùng người trên cùng bài (chưa đọc). */
  commentCount?: number;
  taoLuc?: string;
  daDoc?: boolean;
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
  taoLuc?: string;
};

export type VideoReadyNotification = {
  notificationId: string;
  tacPhamId: string;
  postTitle: string;
  postSlug: string | null;
  ownerSlug: string | null;
  taoLuc?: string;
  daDoc?: boolean;
};

export type FollowHandledNotification = PendingFollowRequest & {
  notificationId: string;
  action: "accept" | "decline";
  xuLyLuc: string;
};

export type ProcessedCoAuthorReview = PendingCoAuthorReview & {
  action: "accept" | "decline";
  xuLyLuc: string;
};

export type NotificationFilter = "unread" | "history";

export type NotificationFeed = {
  unreadCount: number;
  followRequests: PendingFollowRequest[];
  accepted: FollowAcceptedNotification[];
  comments: CommentNotification[];
  coAuthorInvites: PendingCoAuthorInviteNotification[];
  coAuthorReviews: PendingCoAuthorReview[];
  videoReady: VideoReadyNotification[];
  handledFollows: FollowHandledNotification[];
  processedCoAuthorReviews: ProcessedCoAuthorReview[];
};
