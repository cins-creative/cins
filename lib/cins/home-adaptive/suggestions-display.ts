/** Types + helpers hiển thị gợi ý — dùng được cả client và server. */

export type FollowSuggestion = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  /** Ảnh bìa hồ sơ — card promo / gợi ý kiểu friend-card. */
  coverUrl: string | null;
  /** Mô tả ngắn hồ sơ (bio). */
  bio: string | null;
  giaiDoan: string | null;
  /** Số bạn chung với người xem (0 nếu không có / không xác định). */
  mutualCount: number;
  /** Người xem đã là bạn bè (kết bạn accepted) với gợi ý này. */
  isFriend: boolean;
};

export type OrgFollowSuggestion = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  loaiToChuc: string;
  href: string;
  /** Số bạn chung đang theo dõi org này. */
  mutualCount: number;
  /** Lý do gợi ý hiển thị (1 dòng phụ). */
  reason: string;
};

/** Trường / cơ sở đào tạo — feed promo xen kẽ (cả hai loại). */
export const SCHOOL_ORG_LOAI = ["truong_dai_hoc", "co_so_dao_tao"] as const;

/** Chỉ cơ sở đào tạo (không trường đại học) — module sidebar `duong_toi_do`. */
export const CO_SO_DAO_TAO_LOAI = ["co_so_dao_tao"] as const;

export function orgLoaiLabel(loai: string): string {
  switch (loai) {
    case "truong_dai_hoc":
      return "Trường đại học";
    case "co_so_dao_tao":
      return "Cơ sở đào tạo";
    case "studio":
      return "Studio";
    case "doanh_nghiep":
      return "Doanh nghiệp";
    case "cong_dong":
      return "Cộng đồng";
    default:
      return "Tổ chức";
  }
}

/** Dòng phụ org — luôn có loại tổ chức để không nhầm với người dùng. */
export function orgFollowSubtitle(loaiToChuc: string, reason: string): string {
  const typeLabel = orgLoaiLabel(loaiToChuc);
  if (!reason || reason === typeLabel) return typeLabel;
  return `${typeLabel} · ${reason}`;
}
