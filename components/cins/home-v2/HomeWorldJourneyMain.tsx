import { redirect } from "next/navigation";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import { HomeModuleColumn } from "@/components/cins/home-adaptive/HomeModuleColumn";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { JourneyPendingConfirmationsStack } from "@/components/journey/JourneyPendingConfirmationsStack";
import {
  getCachedOutboundMembershipPending,
  getCachedPendingCoAuthorInvites,
  getCachedPendingCoSoStaffInvites,
} from "@/lib/journey/journey-page-cache";
import {
  resolvePersona,
  resolveSeeking,
  type GiaiDoan,
} from "@/lib/cins/home-adaptive/persona";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { mapLinhVucForGuestAside } from "@/lib/cins/worldJourneyGuestAside";
import {
  fetchWorldJourneyExploreMilestonesCached,
  fetchWorldJourneyFeedMilestonesCached,
} from "@/lib/cins/worldJourneyFeedFetch";
import { loadFeedInlinePromos } from "@/lib/cins/worldJourneyFeedPromos";
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
  const giaiDoan = owner.giai_doan as GiaiDoan | null;
  const [
    milestones,
    exploreMilestones,
    coAuthorPendingInvites,
    coSoStaffPendingInvites,
    membershipPendingOutbound,
    feedPromos,
  ] = await Promise.all([
    fetchWorldJourneyFeedMilestonesCached(session.profile.id),
    fetchWorldJourneyExploreMilestonesCached(session.profile.id),
    getCachedPendingCoAuthorInvites(session.profile.id),
    getCachedPendingCoSoStaffInvites(session.profile.id),
    getCachedOutboundMembershipPending(session.profile.id),
    loadFeedInlinePromos(session.profile.id, resolvePersona(giaiDoan)),
  ]);

  const moduleCtx: HomeModuleCtx = {
    viewerId: session.profile.id,
    viewerSlug: owner.slug,
    persona: resolvePersona(giaiDoan),
    giaiDoan,
    seeking: resolveSeeking(giaiDoan),
  };

  return (
    <HomeWorldJourneyClient
      leftAside={<HomeModuleColumn side="left" ctx={moduleCtx} />}
      rightAside={<HomeModuleColumn side="right" ctx={moduleCtx} />}
      pendingConfirmations={
        <JourneyPendingConfirmationsStack
          isOwner
          viewerProfileId={session.profile.id}
          ownerSlug={owner.slug}
          ownerName={owner.ten_hien_thi ?? owner.slug}
          ownerAvatarUrl={getAvatarUrl(owner.avatar_id)}
          initialCoAuthorInvites={coAuthorPendingInvites}
          initialCoSoStaffInvites={coSoStaffPendingInvites}
          initialMembershipPending={membershipPendingOutbound}
        />
      }
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
      exploreMilestones={exploreMilestones}
      feedPromos={feedPromos}
    />
  );
}
