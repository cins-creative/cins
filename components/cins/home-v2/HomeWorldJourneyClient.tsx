"use client";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { WorldJourneyFeed } from "@/components/cins/world-journey/WorldJourneyFeed";

import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";

type Props = {
  sidebarProfile: SidebarProfile;
  editProfileInitial: EditProfileInitial;
  countsPromise: Promise<{ friendCount: number; orgCount: number }>;
  viewerProfileId: string;
  ownerAvatarId?: string | null;
  filterChips: WjFilterChip[];
};

/** Bọc feed trang chủ logged-in — overlay compose hoạt động trên wj-composer. */
export function HomeWorldJourneyClient({
  sidebarProfile,
  editProfileInitial,
  countsPromise,
  viewerProfileId,
  ownerAvatarId,
  filterChips,
}: Props) {
  return (
    <JourneyComposeProvider
      ownerId={sidebarProfile.id}
      ownerSlug={sidebarProfile.slug}
      ownerName={sidebarProfile.tenHienThi ?? sidebarProfile.slug}
      ownerAvatarId={ownerAvatarId}
      isOwner
    >
      <WorldJourneyFeed
        sidebarProfile={sidebarProfile}
        editProfileInitial={editProfileInitial}
        countsPromise={countsPromise}
        viewerProfileId={viewerProfileId}
        filterChips={filterChips}
      />
    </JourneyComposeProvider>
  );
}
