import { SuKienListingClient } from "@/components/su-kien/SuKienListingClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadUserSuKienPhanHoiMap } from "@/lib/to-chuc/su-kien-dang-ky";
import { listSuKienForListing } from "@/lib/to-chuc/su-kien-listing";

type Props = {
  initialTab?: string;
};

export async function SuKienListingLoader({
  initialTab,
}: Props) {
  const [events, session] = await Promise.all([
    listSuKienForListing(),
    getCurrentSessionAndProfile(),
  ]);
  const phanHoiMap = await loadUserSuKienPhanHoiMap(session?.profile?.id ?? null);
  const mySuKienPhanHoi = Object.fromEntries(phanHoiMap);

  return (
    <SuKienListingClient
      events={events}
      mySuKienPhanHoi={mySuKienPhanHoi}
      initialTab={initialTab}
      isLoggedIn={Boolean(session?.profile?.id)}
    />
  );
}
