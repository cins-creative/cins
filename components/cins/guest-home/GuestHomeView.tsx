import {
  GuestHomeLoginPanel,
  type GuestHomeLoginPanelProps,
} from "@/components/cins/home-v2/GuestHomeLoginPanel";
import { GuestHomeStage } from "@/components/cins/guest-home/GuestHomeStage";

import "@/app/guest-home.css";

type Props = {
  loginPanelProps?: GuestHomeLoginPanelProps;
};

export async function GuestHomeView({ loginPanelProps }: Props) {
  return (
    <div className="gh-page">
      <div className="gh-layout">
        <div className="gh-main">
          <GuestHomeStage />
        </div>

        <aside className="gh-aside" aria-label="Đăng nhập">
          <GuestHomeLoginPanel {...loginPanelProps} />
        </aside>
      </div>
    </div>
  );
}
