"use client";

import type { ReactNode } from "react";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import { WorldBoostAdminProvider } from "@/components/cins/world-journey/WorldBoostAdminContext";
import { WorldJourneyFeed } from "@/components/cins/world-journey/WorldJourneyFeed";
import {
  worldBoostKey,
  worldBoostTargetFromGalleryLike,
  worldBoostTargetFromMilestoneLike,
} from "@/lib/cins/world-boost-client";

import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

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
  galleryItems?: ReadonlyArray<GalleryMainItem>;
  galleryHasMore?: boolean;
  galleryNextOffset?: number;
  /** Cột module adaptive (server components) truyền xuống feed. */
  leftAside?: ReactNode;
  rightAside?: ReactNode;
  /** Banner "việc cần xác nhận" (co-author, follow…) hiện đầu feed. */
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
  /** L29 — super_admin / admin được đẩy nội dung trên World. */
  canWorldBoost?: boolean;
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
  galleryItems = [],
  galleryHasMore = false,
  galleryNextOffset = 0,
  leftAside,
  rightAside,
  pendingConfirmations,
  feedPromos,
  canWorldBoost = false,
}: Props) {
  const initialBoostedKeys: string[] = [];
  if (canWorldBoost) {
    for (const m of milestones) {
      const t = worldBoostTargetFromMilestoneLike(m);
      if (t && m.worldBoosted) {
        initialBoostedKeys.push(worldBoostKey(t.loai, t.id));
      }
    }
    for (const item of galleryItems) {
      const t = worldBoostTargetFromGalleryLike(item);
      if (t && item.worldBoosted) {
        initialBoostedKeys.push(worldBoostKey(t.loai, t.id));
      }
    }
  }

  return (
    <JourneyComposeProvider
      ownerId={sidebarProfile.id}
      ownerSlug={sidebarProfile.slug}
      ownerName={sidebarProfile.tenHienThi ?? sidebarProfile.slug}
      ownerAvatarId={ownerAvatarId}
      isOwner
      syncComposeUrl={false}
    >
      <WorldBoostAdminProvider
        canBoost={canWorldBoost}
        initialBoostedKeys={initialBoostedKeys}
      >
        <WorldJourneyFeed
          sidebarProfile={sidebarProfile}
          viewerProfileId={viewerProfileId}
          filterChips={filterChips}
          linhVucs={linhVucs}
          milestones={milestones}
          feedHasMore={feedHasMore}
          feedNextOffset={feedNextOffset}
          galleryItems={galleryItems}
          galleryHasMore={galleryHasMore}
          galleryNextOffset={galleryNextOffset}
          leftAside={leftAside}
          rightAside={rightAside}
          pendingConfirmations={pendingConfirmations}
          feedPromos={feedPromos}
        />
      </WorldBoostAdminProvider>
    </JourneyComposeProvider>
  );
}
