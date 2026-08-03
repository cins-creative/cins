"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
import type { ModuleId, Persona } from "@/lib/cins/home-adaptive/persona";
import type { WjLinhVucAsideItem } from "@/lib/cins/worldJourneyGuestAside";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  clearHomeLayoutEditUrl,
  HOME_LAYOUT_EDIT_ENTER_EVENT,
  getHomeLayoutEditViewportServerSnapshot,
  getHomeLayoutEditViewportSnapshot,
  isHomeLayoutEditUrl,
  subscribeHomeLayoutEditViewport,
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
  layoutLeft: ModuleId[];
  layoutRight: ModuleId[];
  layoutHidden: ModuleId[];
  layoutNewlyInjected?: ModuleId[];
  layoutLimits?: HomeLayoutItemLimits;
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
  layoutLeft,
  layoutRight,
  layoutHidden,
  layoutNewlyInjected = [],
  layoutLimits = {},
  moduleNodes,
  capabilities = [],
}: Props) {
  const router = useRouter();
  const isDesktopLayout = useSyncExternalStore(
    subscribeHomeLayoutEditViewport,
    getHomeLayoutEditViewportSnapshot,
    getHomeLayoutEditViewportServerSnapshot,
  );

  /** Bật từ event client (modal «Chỉnh trên trang chủ»). */
  const [enteredClient, setEnteredClient] = useState(false);
  /** Sau «Huỷ/Lưu» — tắt dù prop SSR `editingLayout` còn true đến khi refresh. */
  const [forcedOff, setForcedOff] = useState(false);

  const editing =
    isDesktopLayout &&
    !forcedOff &&
    (enteredClient || editingLayout || isHomeLayoutEditUrl());

  const exitEditing = useCallback(
    (opts?: { refresh?: boolean }) => {
      setForcedOff(true);
      setEnteredClient(false);
      clearHomeLayoutEditUrl();
      if (opts?.refresh) {
        // Soft-refresh nền sau khi UI đã thoát edit — không chặn nút Lưu.
        queueMicrotask(() => router.refresh());
      }
    },
    [router],
  );

  useEffect(() => {
    const onEnter = () => {
      if (!getHomeLayoutEditViewportSnapshot()) {
        clearHomeLayoutEditUrl();
        return;
      }
      setForcedOff(false);
      setEnteredClient(true);
    };
    const onPop = () => {
      if (isHomeLayoutEditUrl() && getHomeLayoutEditViewportSnapshot()) {
        setForcedOff(false);
        setEnteredClient(true);
      } else {
        setForcedOff(true);
        setEnteredClient(false);
        if (isHomeLayoutEditUrl()) clearHomeLayoutEditUrl();
      }
    };
    window.addEventListener(HOME_LAYOUT_EDIT_ENTER_EVENT, onEnter);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener(HOME_LAYOUT_EDIT_ENTER_EVENT, onEnter);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  /** Mobile/tablet mở `/?tuy-chinh=1` hoặc thu hẹp viewport → bỏ param. */
  useEffect(() => {
    if (!isDesktopLayout && isHomeLayoutEditUrl()) {
      clearHomeLayoutEditUrl();
    }
  }, [isDesktopLayout]);

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
        viewerProfileId={viewerProfileId}
        initialLeft={layoutLeft}
        initialRight={layoutRight}
        initialHidden={layoutHidden}
        initialLimits={layoutLimits}
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
