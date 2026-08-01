import { GuestHomeView } from "@/components/cins/guest-home/GuestHomeView";
import type { GuestHomeLoginPanelProps } from "@/components/cins/home-v2/GuestHomeLoginPanel";
import { loadGuestHomeData } from "@/lib/cins/guest-home/loadGuestHomeData";

type Props = {
  loginPanelProps?: GuestHomeLoginPanelProps;
};

export async function GuestHomePage({ loginPanelProps }: Props = {}) {
  const data = await loadGuestHomeData();
  return <GuestHomeView data={data} loginPanelProps={loginPanelProps} />;
}
