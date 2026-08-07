import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import { HomePendingConfirmations } from "@/components/cins/home-v2/HomePendingConfirmations";
import { renderHomeModules } from "@/components/cins/home-adaptive/HomeModuleColumn";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listLinhVucForHub } from "@/lib/career/queries";
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
} from "@/lib/cins/worldJourneyFeedConstants";
import { fetchWorldJourneyFeedPageCached } from "@/lib/cins/worldJourneyFeedFetch";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { loadFeedInlinePromos } from "@/lib/cins/worldJourneyFeedPromos";
import { FEED_SOURCE_DEFAULT } from "@/lib/cins/worldJourneyFeedSource";
import { fetchWorldJourneyGalleryPageCached } from "@/lib/cins/worldJourneyGalleryFetch";
import { mapLinhVucForGuestAside } from "@/lib/cins/worldJourneyGuestAside";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";

import "@/app/[slug]/journey/journey.css";

type Props = {
  /** Chỉ fetch gallery SSR khi URL có `?view=gallery`. */
  includeGallery?: boolean;
  /** `?tuy-chinh=1` — chế độ chỉnh sửa module sidebar (desktop). */
  editingLayout?: boolean;
};

/** Trang chủ đã đăng nhập — World Journey feed + sidebar khám phá. */
export async function HomeWorldJourneyMain({
  includeGallery = false,
  editingLayout = false,
}: Props) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.slug) return null;

  const viewerId = session.profile.id;
  // `giai_doan` có sẵn trong session profile — không chờ `fetchOwnerBySlug`
  // mới biết persona, nhờ vậy mọi fetch nằm chung một tầng song song.
  const giaiDoan = session.profile.giai_doan as GiaiDoan | null;
  if (giaiDoan === null) {
    redirect("/onboarding");
  }

  // Gallery ẩn aside — không vào edit mode.
  const editing = editingLayout && !includeGallery;

  const filterChips = buildWorldJourneyFilterChips();
  const persona = resolvePersona(giaiDoan);
  const seeking = resolveSeeking(giaiDoan);

  const [
    ownerResult,
    linhVucRows,
    feedPage,
    feedPromos,
    galleryPage,
    homeLayoutRaw,
    capabilities,
  ] = await Promise.all([
    fetchOwnerBySlug(session.profile.slug),
    listLinhVucForHub(),
    fetchWorldJourneyFeedPageCached(viewerId, 0, WORLD_JOURNEY_FEED_PAGE_SIZE, {
      source: FEED_SOURCE_DEFAULT,
    }),
    loadFeedInlinePromos(viewerId, persona),
    includeGallery
      ? fetchWorldJourneyGalleryPageCached(
          viewerId,
          0,
          WORLD_JOURNEY_GALLERY_PAGE_SIZE,
          { source: FEED_SOURCE_DEFAULT },
        )
      : Promise.resolve({
          items: [],
          hasMore: false,
          nextOffset: 0,
        }),
    loadHomeLayoutRaw(viewerId),
    loadHomeCapabilities(viewerId),
  ]);

  const { owner, error } = ownerResult;
  if (error || !owner) return null;

  const linhVucs = mapLinhVucForGuestAside(linhVucRows);

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
      // Element chưa resolve — feed hiện ngay, từng khối stream vào sau.
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
  );
}
