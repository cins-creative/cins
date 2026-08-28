"use client";

import { Suspense, use, type ReactNode } from "react";

import type { KetBanStatusSummary } from "@/lib/social/types";
import { JourneySidebarNavCountsSkeleton } from "@/app/[slug]/_components/JourneySidebarNavCounts.skeleton";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { VideoProcessingPoller } from "@/components/journey/VideoProcessingPoller";
import { SubjectPageTracker } from "@/components/social/SubjectPageTracker";
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
import type { ShopCuaHang } from "@/lib/shop/types";

type SwitchNavCounts = {
  friendCount: number;
  orgCount: number;
  shop: ShopCuaHang | null;
};

type Props = {
  activeView: JourneyProfileView;
  profile: SidebarProfile;
  ownerId: string;
  ownerAvatarId?: string | null;
  isOwner: boolean;
  adminSeedingEdit?: boolean;
  editProfileInitial?: EditProfileInitial;
  viewerProfileId: string | null;
  initialKetBanStatus?: KetBanStatusSummary | null;
  initialCompose?: JourneyComposeState | null;
  countsPromise: Promise<SwitchNavCounts>;
  mainPanel: ReactNode;
  featuredAside: ReactNode;
  /** Hiện tab Shop trên cụm chuyển hồ sơ. */
  showShop?: boolean;
};

function JourneySidebarSwitchNavWithCounts({
  slug,
  countsPromise,
  showShop,
}: {
  slug: string;
  countsPromise: Promise<SwitchNavCounts>;
  showShop: boolean;
}) {
  const { friendCount, orgCount, shop } = use(countsPromise);

  return (
    <JourneySidebarSwitchNav
      slug={slug}
      friendCount={friendCount}
      orgCount={orgCount}
      showShop={showShop}
      initialShop={shop}
    />
  );
}

export function JourneyProfileShellClient({
  activeView,
  profile,
  ownerId,
  ownerAvatarId,
  isOwner,
  adminSeedingEdit = false,
  editProfileInitial,
  viewerProfileId,
  initialKetBanStatus = null,
  initialCompose = null,
  countsPromise,
  mainPanel,
  featuredAside,
  showShop = false,
}: Props) {
  const ownerName = profile.tenHienThi ?? profile.slug;
  const canComposePosts = isOwner || adminSeedingEdit;
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
              showShop={showShop}
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
        {/* Khách cũng cần PersonalFilterProvider — không thì mất «Nhãn riêng» trong filter. */}
        <JourneyComposeProvider
          ownerId={ownerId}
          ownerSlug={profile.slug}
          ownerName={ownerName}
          ownerAvatarId={ownerAvatarId}
          isOwner={isOwner}
          adminSeedingEdit={adminSeedingEdit}
          initialCompose={canComposePosts ? initialCompose : null}
        >
          {canComposePosts ? (
            <VideoProcessingPoller ownerSlug={profile.slug} />
          ) : null}
          <SubjectPageTracker
            loai="nguoi_dung"
            id={ownerId}
            nguon="permalink"
            enabled={!isOwner}
          />
          {shell}
        </JourneyComposeProvider>
      </JourneyFeaturedAsideFilterProvider>
    </JourneyViewProvider>
  );
}
