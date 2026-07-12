import { StudioListingClient } from "@/components/to-chuc/StudioListingClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listStudiosForListing } from "@/lib/to-chuc/studio-listing";
import {
  loadViewerFollowingOrgIdSet,
  loadViewerOrgStaffRolesByOrgIds,
} from "@/lib/to-chuc/listing-viewer-roles";

export async function StudioListingLoader() {
  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;
  const studios = await listStudiosForListing();
  const orgIds = studios.map((s) => s.id);
  const [roleMap, followingSet] = await Promise.all([
    loadViewerOrgStaffRolesByOrgIds(viewerId, orgIds),
    loadViewerFollowingOrgIdSet(viewerId, orgIds),
  ]);
  const withViewer = studios.map((s) => ({
    ...s,
    viewerVaiTro: roleMap.get(s.id) ?? null,
    viewerDangTheoDoi: followingSet.has(s.id),
  }));

  return (
    <div className="tdh-page">
      <StudioListingClient
        studios={withViewer}
        canFilterMine={Boolean(viewerId)}
      />
    </div>
  );
}
