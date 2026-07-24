import type { QuanHe } from "@/lib/social/types";

export type SocialInteractionKind = "like" | "dislike" | "comment" | "bookmark";

export type SocialActorProfile = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string;
  avatarUrl: string | null;
  tuongTacLuc: string | null;
  bio: string | null;
  giaiDoan: string | null;
  tinhThanh: string | null;
  mutualFriendCount: number;
  quanHe: QuanHe;
  ketBanId: string | null;
  dangTheoDoi: boolean;
  /** Emoji cảm xúc actor này đã thả (`heart`, `joy`, …) — chỉ có với reaction. */
  reactionEmoji: string | null;
};

/** Phân bố cảm xúc trên một đối tượng — dựng chip lọc theo emoji. */
export type ReactionBreakdownEntry = {
  emoji: string;
  count: number;
};

export type SocialActorsPage = {
  actors: SocialActorProfile[];
  total: number;
  hasMore: boolean;
  viewerId: string | null;
  /** Danh sách emoji đã xuất hiện (count > 0) — rỗng cho comment/bookmark. */
  reactionBreakdown: ReactionBreakdownEntry[];
};
