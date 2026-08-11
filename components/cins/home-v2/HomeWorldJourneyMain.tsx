import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HomeWorldJourneyFeedBlock } from "@/components/cins/home-v2/HomeWorldJourneyFeedBlock";
import { HomeWorldJourneySkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

import "@/app/[slug]/journey/journey.css";

type Props = {
  /** Chỉ fetch gallery SSR khi URL có `?view=gallery`. */
  includeGallery?: boolean;
  /** Prefetch Reels khi URL có `?view=video`. */
  includeVideo?: boolean;
  /** Feed tab Giỏ hàng — `?view=shop`. */
  includeShopFeed?: boolean;
  /** `?tuy-chinh=1` — chế độ chỉnh sửa module sidebar (desktop). */
  editingLayout?: boolean;
};

/**
 * Trang chủ đã đăng nhập — session xong là stream skeleton;
 * feed (owner + milestones) không chờ layout / capabilities / promos.
 */
export async function HomeWorldJourneyMain({
  includeGallery = false,
  includeVideo = false,
  includeShopFeed = false,
  editingLayout = false,
}: Props) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.slug) return null;

  const giaiDoan = session.profile.giai_doan as GiaiDoan | null;
  if (giaiDoan === null) {
    redirect("/onboarding");
  }

  return (
    <Suspense fallback={<HomeWorldJourneySkeleton />}>
      <HomeWorldJourneyFeedBlock
        session={session}
        giaiDoan={giaiDoan}
        includeGallery={includeGallery}
        includeVideo={includeVideo}
        includeShopFeed={includeShopFeed}
        editingLayout={editingLayout}
      />
    </Suspense>
  );
}
