import type { CongDongPost } from "@/lib/cong-dong/types";
import {
  canManageLabels,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";

export type CongDongPostMenuPermissions = {
  canOpenMenu: boolean;
  isAuthor: boolean;
  isModerator: boolean;
  canPin: boolean;
  canUnpin: boolean;
  canEditNative: boolean;
  canEditJourney: boolean;
  /** Đổi nhãn cộng đồng trên card (kể cả bài mirror Journey). */
  canEditFilters: boolean;
  canDelete: boolean;
  canViewJourney: boolean;
};

const CLOSED: CongDongPostMenuPermissions = {
  canOpenMenu: false,
  isAuthor: false,
  isModerator: false,
  canPin: false,
  canUnpin: false,
  canEditNative: false,
  canEditJourney: false,
  canEditFilters: false,
  canDelete: false,
  canViewJourney: false,
};

/** Quyền menu ⋯ trên card bài — tác giả vs owner/admin/QL nội dung. */
export function getCongDongPostMenuPermissions(
  viewerId: string | null,
  viewerVaiTro: CongDongVaiTro | null,
  post: Pick<CongDongPost, "author" | "ghim" | "journeyMirror">,
): CongDongPostMenuPermissions {
  if (!viewerId) return CLOSED;

  const isAuthor = post.author.id === viewerId;
  /** Khớp `isCongDongAdmin` (owner · admin · quan_ly_noi_dung). */
  const isModerator = canManageLabels(viewerVaiTro);
  const canManage = isAuthor || isModerator;
  if (!canManage) return CLOSED;

  const hasMirror = Boolean(post.journeyMirror);

  return {
    canOpenMenu: true,
    isAuthor,
    isModerator,
    canPin: isModerator && !post.ghim,
    canUnpin: isModerator && post.ghim,
    canEditNative: canManage && !hasMirror,
    canEditJourney: isAuthor && hasMirror,
    canEditFilters: canManage,
    canDelete: canManage,
    canViewJourney: hasMirror,
  };
}
