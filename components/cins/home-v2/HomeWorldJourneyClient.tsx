"use client";

import type { ReactNode } from "react";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { WorldJourneyFeed } from "@/components/cins/world-journey/WorldJourneyFeed";

import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import type { HomeFeedDisplay } from "@/lib/cins/home-feed-display-url";
import type { MilestoneItem } from "@/components/journey/milestone-types";

type Props = {
  sidebarProfile: SidebarProfile;
  viewerProfileId: string;
  ownerAvatarId?: string | null;
  filterChips: WjFilterChip[];
  linhVucs: WjLinhVucAsideItem[];
  milestones: MilestoneItem[];
  /** Còn trang feed để load thêm khi scroll. */
  feedHasMore?: boolean;
  feedNextOffset?: number;
  /** Cột module adaptive (server components) truyền xuống feed. */
  leftAside?: ReactNode;
  rightAside?: ReactNode;
  /** Banner "việc cần xác nhận" (co-author, follow…) hiện đầu feed. */
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
  feedView?: HomeFeedDisplay;
};

/** Bọc feed trang chủ logged-in — overlay compose hoạt động trên wj-composer. */
export function HomeWorldJourneyClient({
  sidebarProfile,
  viewerProfileId,
  ownerAvatarId,
  filterChips,
  linhVucs,
  milestones,
  feedHasMore = false,
  feedNextOffset = milestones.length,
  leftAside,
  rightAside,
  pendingConfirmations,
  feedPromos,
  feedView = "feed",
}: Props) {
  return (
    <JourneyComposeProvider
      ownerId={sidebarProfile.id}
      ownerSlug={sidebarProfile.slug}
      ownerName={sidebarProfile.tenHienThi ?? sidebarProfile.slug}
      ownerAvatarId={ownerAvatarId}
      isOwner
      syncComposeUrl={false}
    >
      <WorldJourneyFeed
        sidebarProfile={sidebarProfile}
        viewerProfileId={viewerProfileId}
        filterChips={filterChips}
        linhVucs={linhVucs}
        milestones={milestones}
        feedHasMore={feedHasMore}
        feedNextOffset={feedNextOffset}
        leftAside={leftAside}
        rightAside={rightAside}
        pendingConfirmations={pendingConfirmations}
        feedPromos={feedPromos}
        feedView={feedView}
      />
    </JourneyComposeProvider>
  );
}
