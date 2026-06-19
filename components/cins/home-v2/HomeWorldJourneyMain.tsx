import { redirect } from "next/navigation";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { mapLinhVucForGuestAside } from "@/lib/cins/worldJourneyGuestAside";
import { fetchWorldJourneyFeedMilestonesCached } from "@/lib/cins/worldJourneyFeedFetch";
import { listLinhVucForHub } from "@/lib/career/queries";

import "@/app/[slug]/journey/journey.css";

/** Trang chủ đã đăng nhập — World Journey feed + sidebar khám phá (trang khách). */
export async function HomeWorldJourneyMain() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.slug) return null;

  const { owner, error } = await fetchOwnerBySlug(session.profile.slug);
  if (error || !owner) return null;

  if (owner.giai_doan === null) {
    redirect("/onboarding");
  }

  const filterChips = buildWorldJourneyFilterChips();
  const linhVucs = mapLinhVucForGuestAside(await listLinhVucForHub());
  const milestones = await fetchWorldJourneyFeedMilestonesCached(session.profile.id);

  return (
    <HomeWorldJourneyClient
      sidebarProfile={{
        id: owner.id,
        slug: owner.slug,
        tenHienThi: owner.ten_hien_thi,
        avatarUrl: getAvatarUrl(owner.avatar_id),
        coverUrl: getProfileCoverUrl(owner.cover_id),
        bio: owner.bio,
        tinhThanh: owner.tinh_thanh,
        emailLienHe: owner.email_lien_he ?? session.email ?? null,
        mxhLinks: owner.mxh_links,
        aiSummaryJourney: owner.ai_summary_journey,
        giaiDoan: owner.giai_doan,
      }}
      viewerProfileId={session.profile.id}
      ownerAvatarId={owner.avatar_id}
      filterChips={filterChips}
      linhVucs={linhVucs}
      milestones={milestones}
    />
  );
}
