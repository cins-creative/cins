import "server-only";

import type { MilestoneType } from "@/components/journey/milestone-types";
import type { Visibility } from "@/lib/editor/types";
import {
  getVisibility,
  normalizeLoaiMocVisibility,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";
import { isFriend } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type MilestoneViewerAccess = {
  filterVisibility: LoaiMocVisibilityMap;
  viewerIsFriend: boolean;
};

type CheDoHienThi = Visibility | "public" | "theo_nhom" | "chi_minh" | "feature";

/** Owner thấy mọi cột mốc; visitor bị lọc theo che_do_hien_thi + loai_moc filter. */
export function isSelfMilestoneVisibleToViewer(
  params: {
    loaiMoc: MilestoneType;
    cheDoHienThi: CheDoHienThi;
    isOwner: boolean;
    filterVisibility: LoaiMocVisibilityMap;
    viewerIsFriend: boolean;
  },
): boolean {
  const { loaiMoc, cheDoHienThi, isOwner, filterVisibility, viewerIsFriend } =
    params;
  if (isOwner) return true;
  if (cheDoHienThi === "chi_minh") return false;
  if (cheDoHienThi === "theo_nhom" && !viewerIsFriend) return false;
  if (getVisibility(filterVisibility, loaiMoc) !== "public") return false;
  return true;
}

/** Bookmark / tagged milestone gốc — không áp journey_loai_moc_visibility của chủ Journey. */
export function isForeignMilestoneVisibleToViewer(
  cheDoHienThi: CheDoHienThi,
  options: { isOwner: boolean; viewerIsFriend: boolean },
): boolean {
  if (options.isOwner) return true;
  if (cheDoHienThi === "chi_minh") return false;
  if (cheDoHienThi === "theo_nhom" && !options.viewerIsFriend) return false;
  if (cheDoHienThi !== "public" && cheDoHienThi !== "feature") return false;
  return true;
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
