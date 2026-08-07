"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  HomeEditableColumn,
  HomeEditToolbar,
  HomeLayoutEditProvider,
} from "@/components/cins/home-adaptive/HomeLayoutBoard";
import { WorldJourneyFeed } from "@/components/cins/world-journey/WorldJourneyFeed";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { HomeCapability } from "@/lib/cins/home-adaptive/capability-types";
import type { HomeLayoutItemLimits } from "@/lib/cins/home-adaptive/layout-prefs";
import type { ModuleId, Persona, GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import type { PresetId } from "@/lib/cins/home-adaptive/presets";
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  clearHomeLayoutEditUrl,
  HOME_LAYOUT_EDIT_ENTER_EVENT,
  isHomeLayoutEditUrl,
} from "@/lib/home/home-layout-edit";

type Props = {
  sidebarProfile: SidebarProfile;
  viewerProfileId: string;
  ownerAvatarId?: string | null;
  filterChips: WjFilterChip[];
  linhVucs: WjLinhVucAsideItem[];
  milestones: MilestoneItem[];
  feedHasMore?: boolean;
  feedNextOffset?: number;
  galleryItems?: ReadonlyArray<GalleryMainItem>;
  galleryHasMore?: boolean;
  galleryNextOffset?: number;
  pendingConfirmations?: ReactNode;
  feedPromos?: FeedPromoVariant[];
  editingLayout?: boolean;
  layoutPersona: Persona;
  layoutGiaiDoan?: GiaiDoan | null;
  layoutLeft: ModuleId[];
  layoutRight: ModuleId[];
  layoutHidden: ModuleId[];
  layoutNewlyInjected?: ModuleId[];
  layoutLimits?: HomeLayoutItemLimits;
  layoutPresetDaAp?: PresetId[];
  moduleNodes: ReactNode;
  capabilities?: HomeCapability[];
};

/** Bọc feed trang chủ logged-in — overlay compose + tuỳ chỉnh sidebar. */
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
  pendingConfirmations,
  feedPromos,
  editingLayout = false,
  layoutPersona,
  layoutGiaiDoan = null,
  layoutLeft,
  layoutRight,
  layoutHidden,
  layoutNewlyInjected = [],
  layoutLimits = {},
  layoutPresetDaAp = [],
  moduleNodes,
  capabilities = [],
}: Props) {
  const router = useRouter();
  /** Edit mode client-owned — tránh remount RSC khi vào từ modal. */
  const [editing, setEditing] = useState(
    () => editingLayout || isHomeLayoutEditUrl(),
  );

  useEffect(() => {
    if (editingLayout) setEditing(true);
  }, [editingLayout]);

  useEffect(() => {
    const onEnter = () => setEditing(true);
    const onPop = () => setEditing(isHomeLayoutEditUrl());
    window.addEventListener(HOME_LAYOUT_EDIT_ENTER_EVENT, onEnter);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener(HOME_LAYOUT_EDIT_ENTER_EVENT, onEnter);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const exitEditing = useCallback(
    (opts?: { refresh?: boolean }) => {
      setEditing(false);
      clearHomeLayoutEditUrl();
      if (opts?.refresh) {
        /* Soft-refresh nền sau paint — UI đã hiện live preview / skeleton. */
        const run = () => {
          router.refresh();
        };
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          window.requestIdleCallback(run, { timeout: 1200 });
        } else {
          window.setTimeout(run, 50);
        }
      }
    },
    [router],
  );

  return (
    <JourneyComposeProvider
      ownerId={sidebarProfile.id}
      ownerSlug={sidebarProfile.slug}
      ownerName={sidebarProfile.tenHienThi ?? sidebarProfile.slug}
      ownerAvatarId={ownerAvatarId}
      isOwner
      syncComposeUrl={false}
    >
      <HomeLayoutEditProvider
        editing={editing}
        persona={layoutPersona}
        giaiDoan={layoutGiaiDoan}
        viewerProfileId={viewerProfileId}
        initialLeft={layoutLeft}
        initialRight={layoutRight}
        initialHidden={layoutHidden}
        initialLimits={layoutLimits}
        initialPresetDaAp={layoutPresetDaAp}
        newlyInjected={layoutNewlyInjected}
        moduleNodes={moduleNodes}
        exitEditing={exitEditing}
        capabilities={capabilities}
      >
        <div className={editing ? "ha-home-editing" : undefined}>
          <HomeEditToolbar />
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
            leftAside={<HomeEditableColumn side="left" />}
            rightAside={<HomeEditableColumn side="right" />}
            pendingConfirmations={pendingConfirmations}
            feedPromos={feedPromos}
          />
        </div>
      </HomeLayoutEditProvider>
    </JourneyComposeProvider>
  );
}
