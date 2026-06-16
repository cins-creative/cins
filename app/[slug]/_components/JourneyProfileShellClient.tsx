"use client";

import { Suspense, use, type ReactNode } from "react";

import { JourneySidebarNavCountsSkeleton } from "@/app/[slug]/_components/JourneySidebarNavCounts.skeleton";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import {
  JourneySidebar,
  type JourneyProfileView,
  type SidebarProfile,
} from "@/components/journey/JourneySidebar";
import { JourneySidebarSwitchNav } from "@/components/journey/JourneySidebarSwitchNav";
import { JourneyViewProvider } from "@/components/journey/JourneyViewContext";

type SwitchNavCounts = {
  friendCount: number;
  orgCount: number;
};

type Props = {
  activeView: JourneyProfileView;
  profile: SidebarProfile;
  isOwner: boolean;
  editProfileInitial?: EditProfileInitial;
  viewerProfileId: string | null;
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
  isOwner,
  editProfileInitial,
  viewerProfileId,
  countsPromise,
  mainPanel,
  featuredAside,
}: Props) {
  return (
    <JourneyViewProvider initialView={activeView} slug={profile.slug}>
      <div className="j-shell">
        <JourneySidebar
          profile={profile}
          isOwner={isOwner}
          editProfileInitial={editProfileInitial}
          viewerProfileId={viewerProfileId}
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
    </JourneyViewProvider>
  );
}
