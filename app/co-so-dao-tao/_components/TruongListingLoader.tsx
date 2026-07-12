import { TruongListingClient } from "@/components/truong/TruongListingClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listCoSoDaoTaoForListing } from "@/lib/to-chuc/listing-queries";
import {
  loadViewerFollowingOrgIdSet,
  loadViewerOrgStaffRolesByOrgIds,
} from "@/lib/to-chuc/listing-viewer-roles";
import { listTruongDaiHoc } from "@/lib/truong/queries";

export async function TruongListingLoader() {
  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;

  const [truongDaiHoc, coSoDaoTao] = await Promise.all([
    listTruongDaiHoc(),
    listCoSoDaoTaoForListing(),
  ]);
  const schools = [...truongDaiHoc, ...coSoDaoTao].sort((a, b) =>
    a.ten.localeCompare(b.ten, "vi"),
  );

  const orgIds = schools.map((s) => s.id);
  const [roleMap, followingSet] = await Promise.all([
    loadViewerOrgStaffRolesByOrgIds(viewerId, orgIds),
    loadViewerFollowingOrgIdSet(viewerId, orgIds),
  ]);
  const withViewer = schools.map((s) => ({
    ...s,
    viewerVaiTro: roleMap.get(s.id) ?? null,
    viewerDangTheoDoi: followingSet.has(s.id),
  }));

  return (
    <div className="tdh-page">
      <TruongListingClient
        schools={withViewer}
        canFilterMine={Boolean(viewerId)}
      />
    </div>
  );
}
