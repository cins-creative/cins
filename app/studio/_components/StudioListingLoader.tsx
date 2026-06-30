import { StudioListingClient } from "@/components/to-chuc/StudioListingClient";
import { listStudiosForListing } from "@/lib/to-chuc/studio-listing";

export async function StudioListingLoader() {
  const studios = await listStudiosForListing();

  return (
    <div className="tdh-page">
      <StudioListingClient studios={studios} />
    </div>
  );
}
