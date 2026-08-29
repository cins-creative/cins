import type { Metadata } from "next";

import { BeMatPageTracker } from "@/components/social/BeMatPageTracker";
import { GuestHomeLanding } from "@/components/cins/guest-home/GuestHomeLanding";
import { GuestHomePage } from "@/components/cins/guest-home/GuestHomePage";
import { GuestHomeThemeLight } from "@/components/cins/guest-home/GuestHomeThemeLight";
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
    const { HomeAuthedPage } = await import(
      "@/components/cins/home-v2/HomeAuthedPage"
    );
    return (
      <HomeAuthedPage
        profileId={session.profile.id}
        includeGallery={includeGallery}
        includeVideo={includeVideo}
        includeShopFeed={includeShopFeed}
        editingLayout={editingLayout}
        initialView={sp.view}
        initialPlayId={sp.play}
      />
    );
  }

  return (
    <GuestHomeLanding screenLabel="Trang-chu">
      <BeMatPageTracker nguon="journey_home" />
      <GuestHomeThemeLight />
      <GuestHomePage />
    </GuestHomeLanding>
  );
}
