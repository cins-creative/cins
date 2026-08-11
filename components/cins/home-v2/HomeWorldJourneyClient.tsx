"use client";

import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  HomeEditableColumn,
  HomeEditToolbar,
  HomeLayoutEditProvider,
} from "@/components/cins/home-adaptive/HomeLayoutBoard";
import type { HomeLayoutResolvePayload } from "@/components/cins/home-v2/home-layout-resolve";
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

type LayoutDraft = {
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
  newlyInjected: ModuleId[];
  limits: HomeLayoutItemLimits;
  presetDaAp: PresetId[];
  capabilities: HomeCapability[];
};

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
  /** Stream promos sau — không chặn paint feed. */
  feedPromosPromise?: Promise<FeedPromoVariant[]>;
  editingLayout?: boolean;
  layoutPersona: Persona;
  layoutGiaiDoan?: GiaiDoan | null;
  layoutLeft: ModuleId[];
  layoutRight: ModuleId[];
  layoutHidden: ModuleId[];
  layoutNewlyInjected?: ModuleId[];
  layoutLimits?: HomeLayoutItemLimits;
  layoutPresetDaAp?: PresetId[];
  /** Khi có: hydrate layout/capabilities sau critical path (không remount feed). */
  layoutPromise?: Promise<HomeLayoutResolvePayload>;
  moduleNodes: ReactNode;
  /** Module ngoài layout mặc định (Suspense RSC). */
  children?: ReactNode;
  capabilities?: HomeCapability[];
};

function PromosResolver({
  promosPromise,
  onResolve,
}: {
  promosPromise: Promise<FeedPromoVariant[]>;
  onResolve: (promos: FeedPromoVariant[]) => void;
}) {
  const promos = use(promosPromise);
  useEffect(() => {
    onResolve(promos);
  }, [promos, onResolve]);
  return null;
}

function LayoutResolver({
  layoutPromise,
  onResolve,
}: {
  layoutPromise: Promise<HomeLayoutResolvePayload>;
  onResolve: (payload: HomeLayoutResolvePayload) => void;
}) {
  const payload = use(layoutPromise);
  useEffect(() => {
    onResolve(payload);
  }, [payload, onResolve]);
  return null;
}

function payloadToDraft(payload: HomeLayoutResolvePayload): LayoutDraft {
  return {
    left: [...payload.layout.left],
    right: [...payload.layout.right],
    hidden: [...payload.layout.hidden],
    newlyInjected: [...payload.layout.newlyInjected],
    limits: { ...payload.layout.limits },
    presetDaAp: [...payload.layout.presetDaAp],
    capabilities: [...payload.capabilityList],
  };
}

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
  feedPromos: feedPromosProp,
  feedPromosPromise,
  editingLayout = false,
  layoutPersona,
  layoutGiaiDoan = null,
  layoutLeft,
  layoutRight,
  layoutHidden,
  layoutNewlyInjected = [],
  layoutLimits = {},
  layoutPresetDaAp = [],
  layoutPromise,
  moduleNodes,
  children = null,
  capabilities: capabilitiesProp = [],
}: Props) {
  const router = useRouter();
  /** Edit từ URL / event — OR với prop SSR, không cần sync effect. */
  const [editingFromClient, setEditingFromClient] = useState(() =>
    isHomeLayoutEditUrl(),
  );
  const editing = Boolean(editingLayout) || editingFromClient;

  const layoutFromProps: LayoutDraft = {
    left: layoutLeft,
    right: layoutRight,
    hidden: layoutHidden,
    newlyInjected: layoutNewlyInjected,
    limits: layoutLimits,
    presetDaAp: layoutPresetDaAp,
    capabilities: capabilitiesProp,
  };

  /** Chỉ set khi layoutPromise resolve — không ghi đè bằng effect từ props. */
  const [layoutHydrated, setLayoutHydrated] = useState<LayoutDraft | null>(null);
  const layoutDraft = layoutHydrated ?? layoutFromProps;

  const [promosHydrated, setPromosHydrated] = useState<
    FeedPromoVariant[] | null
  >(null);
  const feedPromos = promosHydrated ?? feedPromosProp;

  useEffect(() => {
    const onEnter = () => setEditingFromClient(true);
    const onPop = () => setEditingFromClient(isHomeLayoutEditUrl());
    window.addEventListener(HOME_LAYOUT_EDIT_ENTER_EVENT, onEnter);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener(HOME_LAYOUT_EDIT_ENTER_EVENT, onEnter);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const onLayoutResolve = useCallback((payload: HomeLayoutResolvePayload) => {
    setLayoutHydrated(payloadToDraft(payload));
  }, []);

  const onPromosResolve = useCallback((promos: FeedPromoVariant[]) => {
    setPromosHydrated(promos);
  }, []);

  const exitEditing = useCallback(
    (opts?: { refresh?: boolean }) => {
      setEditingFromClient(false);
      clearHomeLayoutEditUrl();
      if (opts?.refresh) {
        /* Soft-refresh nền sau paint — UI đã hiện live preview / skeleton. */
        const run = () => {
          router.refresh();
        };
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          window.requestIdleCallback(run, { timeout: 1200 });
        } else {
          globalThis.setTimeout(run, 50);
        }
      }
    },
    [router],
  );

  const mergedModules = (
    <>
      {moduleNodes}
      {children}
    </>
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
      {layoutPromise ? (
        <Suspense fallback={null}>
          <LayoutResolver
            layoutPromise={layoutPromise}
            onResolve={onLayoutResolve}
          />
        </Suspense>
      ) : null}
      {feedPromosPromise ? (
        <Suspense fallback={null}>
          <PromosResolver
            promosPromise={feedPromosPromise}
            onResolve={onPromosResolve}
          />
        </Suspense>
      ) : null}
      <HomeLayoutEditProvider
        editing={editing}
        persona={layoutPersona}
        giaiDoan={layoutGiaiDoan}
        viewerProfileId={viewerProfileId}
        initialLeft={layoutDraft.left}
        initialRight={layoutDraft.right}
        initialHidden={layoutDraft.hidden}
        initialLimits={layoutDraft.limits}
        initialPresetDaAp={layoutDraft.presetDaAp}
        newlyInjected={layoutDraft.newlyInjected}
        moduleNodes={mergedModules}
        exitEditing={exitEditing}
        capabilities={layoutDraft.capabilities}
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
