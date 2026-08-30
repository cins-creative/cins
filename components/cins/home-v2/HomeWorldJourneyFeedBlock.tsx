import { Suspense } from "react";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
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
  WORLD_JOURNEY_VIDEO_RAIL_POOL,
} from "@/lib/cins/worldJourneyFeedConstants";
import { fetchWorldJourneyFeedPageCached } from "@/lib/cins/worldJourneyFeedFetch";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { loadFeedInlinePromos } from "@/lib/cins/worldJourneyFeedPromos";
import { FEED_SOURCE_DEFAULT } from "@/lib/cins/worldJourneyFeedSource";
import { fetchWorldJourneyGalleryPageCached } from "@/lib/cins/worldJourneyGalleryFetch";
import { fetchWorldJourneyVideoRailPageCached } from "@/lib/cins/worldJourneyVideoRailFetch";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";

type Props = {
  session: SessionAndProfile;
  giaiDoan: GiaiDoan;
  includeGallery?: boolean;
  includeVideo?: boolean;
  includeShopFeed?: boolean;
  editingLayout?: boolean;
  initialView?: string;
  initialPlayId?: string;
};

/**
 * Critical path: owner + feed + layout id list (+ gallery/video theo view).
 * Layout/caps chạy **song song** với feed (Promise.all → max). Mỗi module sidebar
 * vẫn Suspense riêng — không chờ data từng khối.
 */
export async function HomeWorldJourneyFeedBlock({
  session,
  giaiDoan,
  includeGallery = false,
  includeVideo = false,
  includeShopFeed = false,
  editingLayout = false,
  initialView,
  initialPlayId,
}: Props) {
  const profile = session.profile;
  if (!profile?.slug) return null;
  const viewerId = profile.id;
  const slug = profile.slug;

  const editing = editingLayout && !includeGallery && !includeVideo;
  const filterChips = buildWorldJourneyFilterChips();
  const persona = resolvePersona(giaiDoan);
  const seeking = resolveSeeking(giaiDoan);

  /*
   * Layout + caps chạy song song với feed (Promise.all → max, không cộng dồn).
   * Bắt buộc resolve trước khi dựng moduleNodes: nếu chỉ seed default rồi hydrate
   * layout đã lưu sau, ExtraModules nằm trong Suspense không vào childMap → 2 cột
   * trống (CSS ẩn slot không có [data-ha-module]).
   */
  const layoutPromise = Promise.all([
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

  const videoRailPromise = fetchWorldJourneyVideoRailPageCached(
    viewerId,
    0,
    WORLD_JOURNEY_VIDEO_RAIL_POOL,
  );

  const [
    ownerResult,
    feedPage,
    galleryPage,
    layoutResolved,
    editPromos,
    videoRailPage,
  ] = await Promise.all([
      fetchOwnerBySlug(slug),
      fetchWorldJourneyFeedPageCached(viewerId, 0, WORLD_JOURNEY_FEED_PAGE_SIZE, {
        source: FEED_SOURCE_DEFAULT,
        shopOnly: includeShopFeed,
      }),
      galleryPromise,
      layoutPromise,
      editing ? promosPromise : Promise.resolve(undefined),
      videoRailPromise,
    ]);

  const { owner, error } = ownerResult;
  if (error || !owner) return null;

  const { layout, capabilityList } = layoutResolved;
  const moduleIds = [...layout.left, ...layout.right];

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
      layoutTutorial={layout.tutorial}
      layoutIntentHint={layout.intentHint}
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
      videoRailItems={videoRailPage.items}
      videoRailHasMore={videoRailPage.hasMore}
      videoRailNextOffset={videoRailPage.nextOffset}
      initialView={initialView}
      initialPlayId={initialPlayId}
      capabilities={capabilityList}
    />
  );
}
