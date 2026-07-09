import type { QuanHe } from "@/lib/social/types";

export type SocialInteractionKind = "like" | "comment" | "bookmark";

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
};

export type SocialActorsPage = {
  actors: SocialActorProfile[];
  total: number;
  hasMore: boolean;
  viewerId: string | null;
};
