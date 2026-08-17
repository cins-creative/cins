import { GuestHomeView } from "@/components/cins/guest-home/GuestHomeView";
import type { GuestHomeLoginPanelProps } from "@/components/cins/home-v2/GuestHomeLoginPanel";

type Props = {
  loginPanelProps?: GuestHomeLoginPanelProps;
};

export async function GuestHomePage({ loginPanelProps }: Props = {}) {
  return <GuestHomeView loginPanelProps={loginPanelProps} />;
}
