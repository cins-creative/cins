import { GuestHomeView } from "@/components/cins/guest-home/GuestHomeView";
import { loadGuestHomeData } from "@/lib/cins/guest-home/loadGuestHomeData";

export async function GuestHomePage() {
  const data = await loadGuestHomeData();
  return <GuestHomeView data={data} />;
}
