"use client";

import { useSyncExternalStore } from "react";

import { JourneyMainPanelSkeleton } from "@/components/journey/JourneyMainPanelSkeleton";
import { JourneyFriendsView } from "@/components/journey/JourneyFriendsView";
import { JourneyGalleryGridView } from "@/components/journey/JourneyGalleryGridView";
import { JourneyOrganizationsView } from "@/components/journey/JourneyOrganizationsView";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { useJourneyView } from "@/components/journey/JourneyViewContext";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import {
  readJourneyPanelCacheForView,
  type JourneyFriendsPanelData,
  type JourneyGalleryPanelData,
  type JourneyOrganizationsPanelData,
  type JourneyTimelinePanelData,
} from "@/lib/journey/journey-panel-local-cache";

type Props = {
  ownerSlug: string;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  isOwner: boolean;
  viewerProfileId: string | null;
  filterVisibility: LoaiMocVisibilityMap;
};

function subscribe() {
  return () => undefined;
}

export function JourneyProfileInstantFallback({
  ownerSlug,
  ownerId,
  ownerName,
  ownerAvatarUrl,
  isOwner,
  viewerProfileId,
  filterVisibility,
}: Props) {
  const { view } = useJourneyView();

  const cached = useSyncExternalStore(
    subscribe,
    () => readJourneyPanelCacheForView(ownerSlug, viewerProfileId, view),
    () => null,
  );

  if (!cached) {
    return <JourneyMainPanelSkeleton />;
  }

  if (view === "gallery") {
    const data = cached as JourneyGalleryPanelData;
    return (
      <JourneyGalleryGridView
        initialItems={data.items}
        totalCount={data.totalCount}
        scrollLoad={{
          ownerSlug,
          hasMore: data.hasMore,
          nextOffset: data.nextOffset,
          filterCounts: data.filterCounts,
        }}
        isOwner={isOwner}
        filterVisibility={filterVisibility}
      />
    );
  }

  if (view === "friends") {
    const data = cached as JourneyFriendsPanelData;
    return (
      <JourneyFriendsView
        initialFriends={data.friends}
        totalCount={data.totalCount}
        isOwner={isOwner}
        viewerProfileId={viewerProfileId}
        scrollLoad={{
          ownerSlug,
          hasMore: data.hasMore,
          nextOffset: data.nextOffset,
        }}
      />
    );
  }

  if (view === "organizations") {
    const data = cached as JourneyOrganizationsPanelData;
    return <JourneyOrganizationsView data={data} />;
  }

  const data = cached as JourneyTimelinePanelData;
  return (
    <JourneyTimeline
      isOwner={isOwner}
      ownerName={ownerName}
      ownerSlug={ownerSlug}
      ownerProfileId={ownerId}
      ownerAvatarUrl={ownerAvatarUrl}
      milestones={data.page.milestones}
      filterVisibility={filterVisibility}
      viewerProfileId={viewerProfileId}
      coAuthorPendingInvites={data.coAuthorPendingInvites}
      coSoStaffPendingInvites={data.coSoStaffPendingInvites ?? []}
      scrollLoad={{
        ownerSlug,
        hasMore: data.page.hasMore,
        nextOffset: data.page.nextOffset,
        filterCounts: data.page.filterCounts,
        totalCount: data.page.totalCount,
      }}
    />
  );
}
