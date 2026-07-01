"use client";

import type { ReactNode } from "react";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { WorldJourneyFeed } from "@/components/cins/world-journey/WorldJourneyFeed";

import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import type { MilestoneItem } from "@/components/journey/milestone-types";

type Props = {
  sidebarProfile: SidebarProfile;
  viewerProfileId: string;
  ownerAvatarId?: string | null;
  filterChips: WjFilterChip[];
  linhVucs: WjLinhVucAsideItem[];
  milestones: MilestoneItem[];
  /** Tab Khám phá — bài Nổi bật toàn cục. */
  exploreMilestones?: MilestoneItem[];
  /** Cột module adaptive (server components) truyền xuống feed. */
  leftAside?: ReactNode;
  rightAside?: ReactNode;
  /** Banner "việc cần xác nhận" (co-author, follow…) hiện đầu feed. */
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
};

/** Bọc feed trang chủ logged-in — overlay compose hoạt động trên wj-composer. */
export function HomeWorldJourneyClient({
  sidebarProfile,
  viewerProfileId,
  ownerAvatarId,
  filterChips,
  linhVucs,
  milestones,
  exploreMilestones,
  leftAside,
  rightAside,
  pendingConfirmations,
  feedPromos,
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
        viewerProfileId={viewerProfileId}
        filterChips={filterChips}
        linhVucs={linhVucs}
        milestones={milestones}
        exploreMilestones={exploreMilestones}
        leftAside={leftAside}
        rightAside={rightAside}
        pendingConfirmations={pendingConfirmations}
        feedPromos={feedPromos}
      />
    </JourneyComposeProvider>
  );
}
