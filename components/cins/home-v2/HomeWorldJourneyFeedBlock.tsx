import { Suspense } from "react";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import { HomeWorldJourneyExtraModules } from "@/components/cins/home-v2/HomeWorldJourneyExtraModules";
import { HomePendingConfirmations } from "@/components/cins/home-v2/HomePendingConfirmations";
import { renderHomeModules } from "@/components/cins/home-adaptive/HomeModuleColumn";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import type { SessionAndProfile } from "@/lib/auth/session";
import {
  loadHomeCapabilities,
  serializeHomeCapabilities,
} from "@/lib/cins/home-adaptive/capabilities";
import { loadHomeLayoutRaw } from "@/lib/cins/home-adaptive/home-layout-store";
import { resolveHomeLayout } from "@/lib/cins/home-adaptive/layout-prefs";
import {
  resolvePersona,
  resolveSeeking,
  type GiaiDoan,
} from "@/lib/cins/home-adaptive/persona";
import {
  WORLD_JOURNEY_FEED_PAGE_SIZE,
  WORLD_JOURNEY_GALLERY_PAGE_SIZE,
  WORLD_JOURNEY_VIDEO_PAGE_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
import { fetchWorldJourneyFeedPageCached } from "@/lib/cins/worldJourneyFeedFetch";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { loadFeedInlinePromos } from "@/lib/cins/worldJourneyFeedPromos";
import { FEED_SOURCE_DEFAULT } from "@/lib/cins/worldJourneyFeedSource";
import { fetchWorldJourneyGalleryPageCached } from "@/lib/cins/worldJourneyGalleryFetch";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";

import type { HomeLayoutResolvePayload } from "@/components/cins/home-v2/home-layout-resolve";

type Props = {
  session: SessionAndProfile;
  giaiDoan: GiaiDoan;
  includeGallery?: boolean;
  includeVideo?: boolean;
  includeShopFeed?: boolean;
  editingLayout?: boolean;
};

/**
 * Critical path: owner + feed (+ gallery/video theo view).
 * Layout / capabilities / promos chạy song song nhưng không chặn paint cột giữa.
 */
export async function HomeWorldJourneyFeedBlock({
  session,
  giaiDoan,
  includeGallery = false,
  includeVideo = false,
  includeShopFeed = false,
  editingLayout = false,
}: Props) {
  const viewerId = session.profile.id;
  const slug = session.profile.slug;
  if (!slug) return null;

  const editing = editingLayout && !includeGallery && !includeVideo;
  const filterChips = buildWorldJourneyFilterChips();
  const persona = resolvePersona(giaiDoan);
  const seeking = resolveSeeking(giaiDoan);

  const layoutPromise: Promise<HomeLayoutResolvePayload> = Promise.all([
    loadHomeLayoutRaw(viewerId),
    loadHomeCapabilities(viewerId),
  ]).then(([homeLayoutRaw, capabilities]) => {
    const capabilityList = serializeHomeCapabilities(capabilities);
    const layout = resolveHomeLayout(
      persona,
      seeking,
      homeLayoutRaw,
      capabilityList,
      giaiDoan,
    );
    return { layout, capabilityList };
  });

  const promosPromise = loadFeedInlinePromos(viewerId, persona);

  const galleryPromise = includeGallery
    ? fetchWorldJourneyGalleryPageCached(
        viewerId,
        0,
        WORLD_JOURNEY_GALLERY_PAGE_SIZE,
        { source: FEED_SOURCE_DEFAULT },
      )
    : includeVideo
      ? fetchWorldJourneyGalleryPageCached(
          viewerId,
          0,
          WORLD_JOURNEY_VIDEO_PAGE_SIZE,
          { filter: "video", source: "all" },
        )
      : Promise.resolve({
          items: [] as GalleryMainItem[],
          hasMore: false,
          nextOffset: 0,
        });

  /* Edit mode cần layout + promos đúng trước kéo thả — await cùng critical. */
  const [ownerResult, feedPage, galleryPage, layoutResolved, editPromos] =
    await Promise.all([
      fetchOwnerBySlug(slug),
      fetchWorldJourneyFeedPageCached(viewerId, 0, WORLD_JOURNEY_FEED_PAGE_SIZE, {
        source: FEED_SOURCE_DEFAULT,
        shopOnly: includeShopFeed,
      }),
      galleryPromise,
      editing ? layoutPromise : Promise.resolve(null),
      editing ? promosPromise : Promise.resolve(undefined),
    ]);

  const { owner, error } = ownerResult;
  if (error || !owner) return null;

  const layoutDefault = resolveHomeLayout(
    persona,
    seeking,
    null,
    null,
    giaiDoan,
  );
  const layout = layoutResolved?.layout ?? layoutDefault;
  const capabilityList = layoutResolved?.capabilityList ?? [];
  const defaultModuleIds = [...layoutDefault.left, ...layoutDefault.right];
  const moduleIds = editing
    ? [...layout.left, ...layout.right]
    : defaultModuleIds;

  const moduleCtx: HomeModuleCtx = {
    viewerId,
    viewerSlug: owner.slug,
    persona,
    giaiDoan,
    seeking,
    itemLimits: layout.limits,
  };

  const ownerAvatarUrl = getAvatarUrl(owner.avatar_id);

  return (
    <HomeWorldJourneyClient
      editingLayout={editing}
      layoutPersona={persona}
      layoutGiaiDoan={giaiDoan}
      layoutLeft={layout.left}
      layoutRight={layout.right}
      layoutHidden={layout.hidden}
      layoutNewlyInjected={layout.newlyInjected}
      layoutLimits={layout.limits}
      layoutPresetDaAp={layout.presetDaAp}
      layoutPromise={editing ? undefined : layoutPromise}
      feedPromosPromise={editing ? undefined : promosPromise}
      feedPromos={editPromos}
      moduleNodes={renderHomeModules(moduleIds, moduleCtx)}
      pendingConfirmations={
        <Suspense fallback={null}>
          <HomePendingConfirmations
            viewerProfileId={viewerId}
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
      viewerProfileId={viewerId}
      ownerAvatarId={owner.avatar_id}
      filterChips={filterChips}
      linhVucs={[]}
      milestones={feedPage.milestones}
      feedHasMore={feedPage.hasMore}
      feedNextOffset={feedPage.nextOffset}
      galleryItems={galleryPage.items}
      galleryHasMore={galleryPage.hasMore}
      galleryNextOffset={galleryPage.nextOffset}
      capabilities={capabilityList}
    >
      {editing ? null : (
        <Suspense fallback={null}>
          <HomeWorldJourneyExtraModules
            viewerId={viewerId}
            viewerSlug={owner.slug}
            persona={persona}
            seeking={seeking}
            giaiDoan={giaiDoan}
            defaultModuleIds={defaultModuleIds}
          />
        </Suspense>
      )}
    </HomeWorldJourneyClient>
  );
}
