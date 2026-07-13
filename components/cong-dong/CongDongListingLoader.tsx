import { CongDongListingClient } from "@/components/cong-dong/CongDongListingClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listPendingCongDongInviteNotifications } from "@/lib/cong-dong/invite";
import { loadCongDongListingFacets } from "@/lib/cong-dong/listing-facets";
import { listCongDongOrgs } from "@/lib/cong-dong/queries";

type Props = {
  initialLinhVucSlug?: string | null;
  initialNganhSlug?: string | null;
  initialMine?: boolean;
};

export async function CongDongListingLoader({
  initialLinhVucSlug = null,
  initialNganhSlug = null,
  initialMine = false,
}: Props) {
  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;
  const communities = await listCongDongOrgs(viewerId);
  const facets = await loadCongDongListingFacets(communities);
  const pendingInvites = viewerId
    ? await listPendingCongDongInviteNotifications(viewerId, { limit: 30 })
    : [];

  return (
    <div className="cd-list-page">
      <CongDongListingClient
        communities={communities}
        linhVucFacets={facets.linhVucs}
        nganhFacets={facets.nganhs}
        pendingInvites={pendingInvites}
        initialLinhVucSlug={initialLinhVucSlug}
        initialNganhSlug={initialNganhSlug}
        initialMine={initialMine}
        canFilterMine={Boolean(viewerId)}
      />
    </div>
  );
}
