import type { Metadata } from "next";

import { GuestHomePage } from "@/components/cins/guest-home/GuestHomePage";
import { CinsShell } from "@/components/cins/CinsShell";
import { HomeWorldJourneyMain } from "@/components/cins/home-v2/HomeWorldJourneyMain";
import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
  description:
    "Khám phá nghề, ngành đào tạo, trường học, khóa học và sự kiện ngành sáng tạo thị giác — dữ liệu thật trên CINs.",
};

export default async function Home() {
  const session = await getCurrentSessionAndProfile();

  if (session?.profile?.slug) {
    return (
      <CinsShell data-screen-label="Trang-chu">
        <AuthGateRoot initialAuthenticated>
          <HomeWorldJourneyMain />
        </AuthGateRoot>
      </CinsShell>
    );
  }

  return (
    <CinsShell data-screen-label="Trang-chu" className="cins-shell--guest-home">
      <GuestHomePage />
    </CinsShell>
  );
}
