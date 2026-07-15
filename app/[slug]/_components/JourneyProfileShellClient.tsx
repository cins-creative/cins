"use client";

import { Suspense, use, type ReactNode } from "react";

import type { KetBanStatusSummary } from "@/lib/social/types";
import { JourneySidebarNavCountsSkeleton } from "@/app/[slug]/_components/JourneySidebarNavCounts.skeleton";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { JourneyFeaturedAsideFilterProvider } from "@/components/journey/JourneyFeaturedAsideFilterContext";
import {
  JourneySidebar,
  type JourneyProfileView,
  type SidebarProfile,
} from "@/components/journey/JourneySidebar";
import { JourneySidebarSwitchNav } from "@/components/journey/JourneySidebarSwitchNav";
import { JourneyViewProvider } from "@/components/journey/JourneyViewContext";
import type { JourneyComposeState } from "@/lib/journey/compose-types";

type SwitchNavCounts = {
  friendCount: number;
  orgCount: number;
};

type Props = {
  activeView: JourneyProfileView;
  profile: SidebarProfile;
  ownerId: string;
  ownerAvatarId?: string | null;
  isOwner: boolean;
  editProfileInitial?: EditProfileInitial;
  viewerProfileId: string | null;
  initialKetBanStatus?: KetBanStatusSummary | null;
  initialCompose?: JourneyComposeState | null;
  countsPromise: Promise<SwitchNavCounts>;
  mainPanel: ReactNode;
  featuredAside: ReactNode;
};

function JourneySidebarSwitchNavWithCounts({
  slug,
  countsPromise,
}: {
  slug: string;
  countsPromise: Promise<SwitchNavCounts>;
}) {
  const { friendCount, orgCount } = use(countsPromise);

  return (
    <JourneySidebarSwitchNav
      slug={slug}
      friendCount={friendCount}
      orgCount={orgCount}
    />
  );
}

export function JourneyProfileShellClient({
  activeView,
  profile,
  ownerId,
  ownerAvatarId,
  isOwner,
  editProfileInitial,
  viewerProfileId,
  initialKetBanStatus = null,
  initialCompose = null,
  countsPromise,
  mainPanel,
  featuredAside,
}: Props) {
  const ownerName = profile.tenHienThi ?? profile.slug;
  const shell = (
    <div className="j-shell">
      <JourneySidebar
        profile={profile}
        isOwner={isOwner}
        editProfileInitial={editProfileInitial}
        viewerProfileId={viewerProfileId}
        initialKetBanStatus={initialKetBanStatus}
        switchNav={
          <Suspense fallback={<JourneySidebarNavCountsSkeleton />}>
            <JourneySidebarSwitchNavWithCounts
              slug={profile.slug}
              countsPromise={countsPromise}
            />
          </Suspense>
        }
      />

      {mainPanel}
      {featuredAside}
    </div>
  );

  return (
    <JourneyViewProvider initialView={activeView} slug={profile.slug}>
      <JourneyFeaturedAsideFilterProvider>
        {isOwner ? (
          <JourneyComposeProvider
            ownerId={ownerId}
            ownerSlug={profile.slug}
            ownerName={ownerName}
            ownerAvatarId={ownerAvatarId}
            isOwner
            initialCompose={initialCompose}
          >
            <BunnyVideoProcessingPoller ownerSlug={profile.slug} />
            {shell}
          </JourneyComposeProvider>
        ) : (
          shell
        )}
      </JourneyFeaturedAsideFilterProvider>
    </JourneyViewProvider>
  );
}
