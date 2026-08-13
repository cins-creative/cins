import { ToChucListingClient } from "@/components/to-chuc/ToChucListingClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listCoSoDaoTaoForListing } from "@/lib/to-chuc/listing-queries";
import { listStudiosForListing } from "@/lib/to-chuc/studio-listing";
import {
  loadOrgBaiDangCountByOrgIds,
  loadViewerFollowingOrgIdSet,
  loadViewerOrgStaffRolesByOrgIds,
} from "@/lib/to-chuc/listing-viewer-roles";
import { listTruongDaiHoc } from "@/lib/truong/queries";

export async function ToChucListingLoader() {
  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;

  const [truongDaiHoc, coSoDaoTao, studiosRaw] = await Promise.all([
    listTruongDaiHoc(),
    listCoSoDaoTaoForListing(),
    listStudiosForListing(),
  ]);

  /* Hub chỉ hiện studio (doanh_nghiep ẩn UI). */
  const studios = studiosRaw.filter((s) => s.loaiToChuc === "studio");
  const schools = [...truongDaiHoc, ...coSoDaoTao].sort((a, b) =>
    a.ten.localeCompare(b.ten, "vi"),
  );

  const orgIds = [...schools.map((s) => s.id), ...studios.map((s) => s.id)];
  const [roleMap, followingSet, baiDangCounts] = await Promise.all([
    loadViewerOrgStaffRolesByOrgIds(viewerId, orgIds),
    loadViewerFollowingOrgIdSet(viewerId, orgIds),
    loadOrgBaiDangCountByOrgIds(orgIds),
  ]);

  const schoolsWithViewer = schools.map((s) => ({
    ...s,
    viewerVaiTro: roleMap.get(s.id) ?? null,
    viewerDangTheoDoi: followingSet.has(s.id),
    baiDangCount: baiDangCounts.get(s.id) ?? 0,
  }));
  const studiosWithViewer = studios.map((s) => ({
    ...s,
    viewerVaiTro: roleMap.get(s.id) ?? null,
    viewerDangTheoDoi: followingSet.has(s.id),
    baiDangCount: baiDangCounts.get(s.id) ?? 0,
  }));

  return (
    <div className="tdh-page">
      <ToChucListingClient
        schools={schoolsWithViewer}
        studios={studiosWithViewer}
        canFilterMine={Boolean(viewerId)}
      />
    </div>
  );
}
