import type { Metadata } from "next";
import { Suspense } from "react";

import { BeMatPageTracker } from "@/components/social/BeMatPageTracker";
import { GuestHomePage } from "@/components/cins/guest-home/GuestHomePage";
import { GuestHomeThemeLight } from "@/components/cins/guest-home/GuestHomeThemeLight";
import { CinsShell } from "@/components/cins/CinsShell";
import { HomeWorldJourneyMain } from "@/components/cins/home-v2/HomeWorldJourneyMain";
import { HomeWorldJourneySkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";
import { AuthGateRoot } from "@/components/auth/AuthGateProvider";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
  description:
    "Mạng xã hội chuyên môn ngành sáng tạo Việt Nam — portfolio, cộng đồng, khóa học, cửa hàng và cơ sở đào tạo.",
  alternates: { canonical: "/" },
};

type SearchParams = Promise<{ view?: string; play?: string; "tuy-chinh"?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSessionAndProfile();
  const sp = await searchParams;
  const includeGallery = sp.view === "gallery";
  const includeVideo = sp.view === "video";
  const includeShopFeed = sp.view === "shop";
  const editingLayout = sp["tuy-chinh"] === "1";

  if (session?.profile?.slug) {
    return (
      <CinsShell data-screen-label="Trang-chu" data-cins-authed-home="1">
        <AuthGateRoot initialAuthenticated>
          <BeMatPageTracker
            nguon={includeGallery ? "gallery" : "journey_home"}
          />
          <Suspense fallback={<HomeWorldJourneySkeleton />}>
            <HomeWorldJourneyMain
              includeGallery={includeGallery}
              includeVideo={includeVideo}
              includeShopFeed={includeShopFeed}
              editingLayout={editingLayout}
              initialView={sp.view}
              initialPlayId={sp.play}
            />
          </Suspense>
        </AuthGateRoot>
      </CinsShell>
    );
  }

  return (
    <CinsShell data-screen-label="Trang-chu" className="cins-shell--guest-home">
      <BeMatPageTracker nguon="journey_home" />
      <GuestHomeThemeLight />
      <GuestHomePage />
    </CinsShell>
  );
}
