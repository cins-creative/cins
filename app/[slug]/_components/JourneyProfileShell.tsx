import { JourneyProfileInstantFallback } from "@/app/[slug]/_components/JourneyProfileInstantFallback";
import { JourneyProfileShellClient } from "@/app/[slug]/_components/JourneyProfileShellClient";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import {
  JourneyProfileContent,
  type JourneyProfileInitialData,
} from "@/components/journey/JourneyProfileContent";
import type { JourneyProfileView } from "@/components/journey/JourneySidebar";
import type { GiaiDoan } from "@/lib/auth/session";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import type { JourneyComposeState } from "@/lib/journey/compose-types";
import {
  getCachedGalleryMainPage,
  getCachedJourneySwitchNavCounts,
  getCachedMilestoneTimelinePage,
  getCachedMutualFriendsPage,
  getCachedPendingCoAuthorInvites,
  getCachedPendingCoSoStaffInvites,
  getCachedOutboundMembershipPending,
} from "@/lib/journey/journey-page-cache";
import { fetchUserOrganizationsPage } from "@/lib/journey/user-orgs-fetch";
import { Suspense } from "react";

import type { KetBanStatusSummary } from "@/lib/social/types";

import { JourneyFeaturedAsideSection } from "@/app/[slug]/_components/JourneyFeaturedAsideSection";
import { JourneyFeaturedAsideOnDemand } from "@/app/[slug]/_components/JourneyFeaturedAsideOnDemand";
import { JourneyFeaturedAsideSectionSkeleton } from "@/app/[slug]/_components/JourneyFeaturedAsideSection.skeleton";

type OwnerRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  ai_summary_journey: string | null;
  giai_doan: GiaiDoan | null;
  tinh_thanh: string | null;
  email_lien_he: string | null;
  mxh_links: unknown;
};

type Props = {
  activeView: JourneyProfileView;
  owner: OwnerRow;
  ownerAvatarUrl: string | null;
  ownerCoverUrl: string | null;
  emailForView: string | null;
  ownerName: string;
  isOwner: boolean;
  viewerProfileId: string | null;
  initialKetBanStatus?: KetBanStatusSummary | null;
  filterVisibility: LoaiMocVisibilityMap;
  editProfileInitial?: EditProfileInitial;
  initialCompose?: JourneyComposeState | null;
};

async function loadInitialData(
  activeView: JourneyProfileView,
  params: {
    ownerId: string;
    ownerSlug: string;
    isOwner: boolean;
    viewerProfileId: string | null;
  },
): Promise<JourneyProfileInitialData> {
  const { ownerId, ownerSlug, isOwner, viewerProfileId } = params;

  if (activeView === "gallery") {
    const gallery = await getCachedGalleryMainPage({
      userId: ownerId,
      ownerSlug,
      offset: 0,
    });
    return { gallery };
  }

  if (activeView === "friends") {
    const friends = await getCachedMutualFriendsPage(ownerId, { offset: 0 });
    return { friends };
  }

  if (activeView === "organizations") {
    const organizations = await fetchUserOrganizationsPage(ownerId);
    return { organizations };
  }

  const [page, coAuthorPendingInvites, coSoStaffPendingInvites, membershipPendingOutbound] =
    await Promise.all([
    getCachedMilestoneTimelinePage({
      userId: ownerId,
      isOwner,
      viewerId: viewerProfileId,
      offset: 0,
    }),
    isOwner && viewerProfileId
      ? getCachedPendingCoAuthorInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedPendingCoSoStaffInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedOutboundMembershipPending(viewerProfileId)
      : Promise.resolve([]),
  ]);

  return {
    timeline: {
      page,
      coAuthorPendingInvites,
      coSoStaffPendingInvites,
      membershipPendingOutbound,
    },
  };
}

async function JourneyProfileInitialLoader({
  activeView,
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
  ownerAvatarId,
  isOwner,
  viewerProfileId,
  filterVisibility,
}: {
  activeView: JourneyProfileView;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerAvatarId: string | null;
  isOwner: boolean;
  viewerProfileId: string | null;
  filterVisibility: LoaiMocVisibilityMap;
}) {
  const initialData = await loadInitialData(activeView, {
    ownerId,
    ownerSlug,
    isOwner,
    viewerProfileId,
  });

  return (
    <JourneyProfileContent
      initialData={initialData}
      ownerId={ownerId}
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl}
      ownerAvatarId={ownerAvatarId}
      isOwner={isOwner}
      viewerProfileId={viewerProfileId}
      filterVisibility={filterVisibility}
    />
  );
}

export function JourneyProfileShell({
  activeView,
  owner,
  ownerAvatarUrl,
  ownerCoverUrl,
  emailForView,
  ownerName,
  isOwner,
  viewerProfileId,
  initialKetBanStatus = null,
  filterVisibility,
  editProfileInitial,
  initialCompose = null,
}: Props) {
  const countsPromise = getCachedJourneySwitchNavCounts({ ownerId: owner.id }).then(
    ({ friendCount, orgCount }) => ({ friendCount, orgCount }),
  );

  return (
    <JourneyProfileShellClient
      activeView={activeView}
      profile={{
        id: owner.id,
        slug: owner.slug,
        tenHienThi: owner.ten_hien_thi,
        avatarUrl: ownerAvatarUrl,
        coverUrl: ownerCoverUrl,
        bio: owner.bio,
        tinhThanh: owner.tinh_thanh,
        emailLienHe: emailForView,
        mxhLinks: owner.mxh_links,
        aiSummaryJourney: owner.ai_summary_journey,
        giaiDoan: owner.giai_doan,
      }}
      ownerId={owner.id}
      ownerAvatarId={owner.avatar_id}
      isOwner={isOwner}
      editProfileInitial={editProfileInitial}
      viewerProfileId={viewerProfileId}
      initialKetBanStatus={initialKetBanStatus}
      initialCompose={initialCompose}
      countsPromise={countsPromise}
      mainPanel={
        <Suspense
          fallback={
            <JourneyProfileInstantFallback
              ownerSlug={owner.slug}
              ownerId={owner.id}
              ownerName={ownerName}
              ownerAvatarUrl={ownerAvatarUrl}
              isOwner={isOwner}
              viewerProfileId={viewerProfileId}
              filterVisibility={filterVisibility}
            />
          }
        >
          <JourneyProfileInitialLoader
            activeView={activeView}
            ownerId={owner.id}
            ownerSlug={owner.slug}
            ownerName={ownerName}
            ownerAvatarUrl={ownerAvatarUrl}
            ownerAvatarId={owner.avatar_id}
            isOwner={isOwner}
            viewerProfileId={viewerProfileId}
            filterVisibility={filterVisibility}
          />
        </Suspense>
      }
      featuredAside={
        activeView === "journey" ? (
          <Suspense fallback={<JourneyFeaturedAsideSectionSkeleton />}>
            <JourneyFeaturedAsideSection
              ownerId={owner.id}
              ownerSlug={owner.slug}
            />
          </Suspense>
        ) : (
          <JourneyFeaturedAsideOnDemand ownerSlug={owner.slug} />
        )
      }
    />
  );
}
