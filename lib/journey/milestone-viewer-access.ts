import "server-only";

import type { Visibility } from "@/lib/editor/types";
import {
  normalizeLoaiMocVisibility,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";
import {
  applyVisibilityNgoaiLe,
  type VisibilityNgoaiLeEntry,
} from "@/lib/journey/milestone-visibility-custom.shared";
import { isFriend } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type MilestoneViewerAccess = {
  filterVisibility: LoaiMocVisibilityMap;
  viewerIsFriend: boolean;
};

type CheDoHienThi =
  | Visibility
  | "public"
  | "theo_nhom"
  | "chi_minh"
  | "feature"
  | "cong_dong";

function baseSelfVisible(params: {
  cheDoHienThi: CheDoHienThi;
  isOwner: boolean;
  viewerIsFriend: boolean;
}): boolean {
  const { cheDoHienThi, isOwner, viewerIsFriend } = params;
  if (isOwner) return true;
  if (cheDoHienThi === "cong_dong") return false;
  if (cheDoHienThi === "chi_minh") return false;
  if (cheDoHienThi === "theo_nhom" && !viewerIsFriend) return false;
  if (cheDoHienThi !== "public" && cheDoHienThi !== "feature") return false;
  return true;
}

/** Owner thấy mọi cột mốc; visitor theo `che_do_hien_thi` + ngoại lệ tùy chỉnh. */
export function isSelfMilestoneVisibleToViewer(params: {
  cheDoHienThi: CheDoHienThi;
  isOwner: boolean;
  viewerIsFriend: boolean;
  viewerId?: string | null;
  ngoaiLe?: VisibilityNgoaiLeEntry | null;
}): boolean {
  const baseVisible = baseSelfVisible(params);
  return applyVisibilityNgoaiLe({
    baseVisible,
    isOwner: params.isOwner,
    viewerId: params.viewerId,
    ngoaiLe: params.ngoaiLe,
  });
}

/** Bookmark / tagged milestone gốc — không áp journey_loai_moc_visibility của chủ Journey. */
export function isForeignMilestoneVisibleToViewer(
  cheDoHienThi: CheDoHienThi,
  options: {
    isOwner: boolean;
    viewerIsFriend: boolean;
    viewerId?: string | null;
    ngoaiLe?: VisibilityNgoaiLeEntry | null;
  },
): boolean {
  const baseVisible = (() => {
    if (options.isOwner) return true;
    if (cheDoHienThi === "chi_minh") return false;
    if (cheDoHienThi === "theo_nhom" && !options.viewerIsFriend) return false;
    if (cheDoHienThi !== "public" && cheDoHienThi !== "feature") return false;
    return true;
  })();

  return applyVisibilityNgoaiLe({
    baseVisible,
    isOwner: options.isOwner,
    viewerId: options.viewerId,
    ngoaiLe: options.ngoaiLe,
  });
}

export async function loadMilestoneViewerAccess(
  ownerId: string,
  options: { isOwner: boolean; viewerId: string | null },
): Promise<MilestoneViewerAccess> {
  if (options.isOwner) {
    return { filterVisibility: {}, viewerIsFriend: false };
  }

  const admin = createServiceRoleClient();
  const [{ data: owner }, viewerIsFriend] = await Promise.all([
    admin
      .from("user_nguoi_dung")
      .select("journey_loai_moc_visibility")
      .eq("id", ownerId)
      .maybeSingle<{ journey_loai_moc_visibility: Record<string, unknown> | null }>(),
    options.viewerId
      ? isFriend(ownerId, options.viewerId)
      : Promise.resolve(false),
  ]);

  return {
    filterVisibility: normalizeLoaiMocVisibility(
      owner?.journey_loai_moc_visibility,
    ),
    viewerIsFriend,
  };
}
