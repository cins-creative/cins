import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import { HomeAsideSkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";
import { HomePendingConfirmations } from "@/components/cins/home-v2/HomePendingConfirmations";
import { renderHomeModules } from "@/components/cins/home-adaptive/HomeModuleColumn";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import type { SidebarProfile } from "@/components/journey/JourneySidebar";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listLinhVucForHub } from "@/lib/career/queries";
import {
  loadHomeCapabilities,
  serializeHomeCapabilities,
} from "@/lib/cins/home-adaptive/capabilities";
import type { HomeCapability } from "@/lib/cins/home-adaptive/capability-types";
import {
  resolveHomeLayout,
  type ResolvedHomeLayout,
} from "@/lib/cins/home-adaptive/layout-prefs";
import {
  resolvePersona,
  resolveSeeking,
  type GiaiDoan,
  type ModuleId,
  type Persona,
} from "@/lib/cins/home-adaptive/persona";
import {
  WORLD_JOURNEY_FEED_PAGE_SIZE,
  WORLD_JOURNEY_GALLERY_PAGE_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
import { fetchWorldJourneyFeedPageCached } from "@/lib/cins/worldJourneyFeedFetch";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { loadFeedInlinePromos } from "@/lib/cins/worldJourneyFeedPromos";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import { FEED_SOURCE_DEFAULT } from "@/lib/cins/worldJourneyFeedSource";
import { fetchWorldJourneyGalleryPageCached } from "@/lib/cins/worldJourneyGalleryFetch";
import {
  mapLinhVucForGuestAside,
  type WjLinhVucAsideItem,
} from "@/lib/cins/worldJourneyGuestAside";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import "@/app/[slug]/journey/journey.css";

type Props = {
  /** Chỉ fetch gallery SSR khi URL có `?view=gallery`. */
  includeGallery?: boolean;
  /** `?tuy-chinh=1` — chế độ chỉnh sửa module sidebar (desktop). */
  editingLayout?: boolean;
};

async function loadHomeLayoutRaw(profileId: string): Promise<unknown> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("home_layout")
    .eq("id", profileId)
    .maybeSingle<{ home_layout: unknown }>();
  // Cột chưa migrate → fallback mặc định persona (không chặn trang chủ).
  if (error) {
    console.warn("[home-layout] read skipped:", error.message);
    return {};
  }
  return data?.home_layout ?? {};
}

/** Trang chủ đã đăng nhập — World Journey feed + sidebar khám phá. */
export async function HomeWorldJourneyMain({
  includeGallery = false,
  editingLayout = false,
}: Props) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.slug) return null;

  const { owner, error } = await fetchOwnerBySlug(session.profile.slug);
  if (error || !owner) return null;

  if (owner.giai_doan === null) {
    redirect("/onboarding");
  }

  // Gallery ẩn aside — không vào edit mode.
  const editing = editingLayout && !includeGallery;

  const filterChips = buildWorldJourneyFilterChips();
  const linhVucs = mapLinhVucForGuestAside(await listLinhVucForHub());
  const giaiDoan = owner.giai_doan as GiaiDoan | null;
  const persona = resolvePersona(giaiDoan);
  const seeking = resolveSeeking(giaiDoan);

  const [feedPage, feedPromos, galleryPage, homeLayoutRaw, capabilities] =
    await Promise.all([
      fetchWorldJourneyFeedPageCached(
        session.profile.id,
        0,
        WORLD_JOURNEY_FEED_PAGE_SIZE,
        { source: FEED_SOURCE_DEFAULT },
      ),
      loadFeedInlinePromos(session.profile.id, persona),
      includeGallery
        ? fetchWorldJourneyGalleryPageCached(
            session.profile.id,
            0,
            WORLD_JOURNEY_GALLERY_PAGE_SIZE,
            { source: FEED_SOURCE_DEFAULT },
          )
        : Promise.resolve({
            items: [],
            hasMore: false,
            nextOffset: 0,
          }),
      loadHomeLayoutRaw(session.profile.id),
      loadHomeCapabilities(session.profile.id),
    ]);

  const capabilityList = serializeHomeCapabilities(capabilities);
  const layout = resolveHomeLayout(
    persona,
    seeking,
    homeLayoutRaw,
    capabilityList,
    giaiDoan,
  );
  const moduleIds = [...layout.left, ...layout.right];

  const moduleCtx: HomeModuleCtx = {
    viewerId: session.profile.id,
    viewerSlug: owner.slug,
    persona,
    giaiDoan,
    seeking,
    itemLimits: layout.limits,
  };

  const ownerAvatarUrl = getAvatarUrl(owner.avatar_id);

  return (
    <Suspense fallback={<HomeAsideSkeleton side="left" />}>
      <HomeWorldJourneyModules
        moduleIds={moduleIds}
        moduleCtx={moduleCtx}
        layout={layout}
        editing={editing}
        persona={persona}
        pendingConfirmations={
          <Suspense fallback={null}>
            <HomePendingConfirmations
              viewerProfileId={session.profile.id}
              ownerSlug={owner.slug}
              ownerName={owner.ten_hien_thi ?? owner.slug}
              ownerAvatarUrl={ownerAvatarUrl}
            />
          </Suspense>
        }
        sidebarProfile={{
          id: owner.id,
          slug: owner.slug,
          tenHienThi: owner.ten_hien_thi,
          avatarUrl: ownerAvatarUrl,
          coverUrl: getProfileCoverUrl(owner.cover_id),
          bio: owner.bio,
          tinhThanh: owner.tinh_thanh,
          emailLienHe: owner.email_lien_he ?? session.email ?? null,
          mxhLinks: owner.mxh_links,
          aiSummaryJourney: owner.ai_summary_journey,
          giaiDoan: owner.giai_doan,
        }}
        viewerProfileId={session.profile.id}
        ownerAvatarId={owner.avatar_id}
        filterChips={filterChips}
        linhVucs={linhVucs}
        milestones={feedPage.milestones}
        feedHasMore={feedPage.hasMore}
        feedNextOffset={feedPage.nextOffset}
        galleryItems={galleryPage.items}
        galleryHasMore={galleryPage.hasMore}
        galleryNextOffset={galleryPage.nextOffset}
        feedPromos={feedPromos}
        capabilities={capabilityList}
      />
    </Suspense>
  );
}

/** Async boundary: fetch module nodes rồi hydrate client board. */
async function HomeWorldJourneyModules({
  moduleIds,
  moduleCtx,
  layout,
  editing,
  persona,
  ...clientProps
}: {
  moduleIds: ModuleId[];
  moduleCtx: HomeModuleCtx;
  layout: ResolvedHomeLayout;
  editing: boolean;
  persona: Persona;
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
  capabilities?: HomeCapability[];
}) {
  const moduleNodes = await renderHomeModules(moduleIds, moduleCtx);

  return (
    <HomeWorldJourneyClient
      {...clientProps}
      editingLayout={editing}
      layoutPersona={persona}
      layoutLeft={layout.left}
      layoutRight={layout.right}
      layoutHidden={layout.hidden}
      layoutNewlyInjected={layout.newlyInjected}
      layoutLimits={layout.limits}
      moduleNodes={moduleNodes}
    />
  );
}
