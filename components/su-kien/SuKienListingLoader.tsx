import { SuKienListingClient } from "@/components/su-kien/SuKienListingClient";
import { listSuKienForListing } from "@/lib/to-chuc/su-kien-listing";

export async function SuKienListingLoader() {
  const events = await listSuKienForListing();

  return <SuKienListingClient events={events} />;
}
