export type TagAggSort = "moi_nhat" | "nhieu_tuong_tac" | "a_z";

export type TagAggUser = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  ngheChinh: string | null;
};

export type TagAggWork = {
  id: string;
  slug: string;
  tieuDe: string | null;
  coverId: string | null;
  /** Preview từ cover hoặc block ảnh/video — ưu tiên hơn coverId thuần. */
  previewSrc: string | null;
  ownerSlug: string;
  ownerName: string | null;
  width: number;
  height: number;
  taggedAt: string;
  reactionCount: number;
};
