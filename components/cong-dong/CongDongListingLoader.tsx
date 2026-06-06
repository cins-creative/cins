import { CongDongListingClient } from "@/components/cong-dong/CongDongListingClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listCongDongOrgs } from "@/lib/cong-dong/queries";

export async function CongDongListingLoader() {
  const session = await getCurrentSessionAndProfile();
  const communities = await listCongDongOrgs(session?.profile?.id ?? null);

  return (
    <div className="cd-list-page">
      <CongDongListingClient communities={communities} />
    </div>
  );
}
