import type { CongDongPost } from "@/lib/cong-dong/types";
import {
  canManageCommunityContent,
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
  canDelete: false,
  canViewJourney: false,
};

/** Quyền menu ⋯ trên card bài — tác giả vs quản trị nội dung/admin. */
export function getCongDongPostMenuPermissions(
  viewerId: string | null,
  viewerVaiTro: CongDongVaiTro | null,
  post: Pick<CongDongPost, "author" | "ghim" | "journeyMirror">,
): CongDongPostMenuPermissions {
  if (!viewerId) return CLOSED;

  const isAuthor = post.author.id === viewerId;
  const isModerator = canManageCommunityContent(viewerVaiTro);
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
    canDelete: canManage,
    canViewJourney: hasMirror,
  };
}
