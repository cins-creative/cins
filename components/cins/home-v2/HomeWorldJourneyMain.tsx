import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import { HomeAsideSkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";
import { HomePendingConfirmations } from "@/components/cins/home-v2/HomePendingConfirmations";
import { HomeModuleColumn } from "@/components/cins/home-adaptive/HomeModuleColumn";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import {
  resolvePersona,
  resolveSeeking,
  type GiaiDoan,
} from "@/lib/cins/home-adaptive/persona";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getAvatarUrl,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";
import { mapLinhVucForGuestAside } from "@/lib/cins/worldJourneyGuestAside";
import {
  WORLD_JOURNEY_FEED_PAGE_SIZE,
  WORLD_JOURNEY_GALLERY_PAGE_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
import { fetchWorldJourneyFeedPageCached } from "@/lib/cins/worldJourneyFeedFetch";
import { fetchWorldJourneyGalleryPageCached } from "@/lib/cins/worldJourneyGalleryFetch";
import { FEED_SOURCE_DEFAULT } from "@/lib/cins/worldJourneyFeedSource";
import { loadFeedInlinePromos } from "@/lib/cins/worldJourneyFeedPromos";
import { listLinhVucForHub } from "@/lib/career/queries";

import "@/app/[slug]/journey/journey.css";

type Props = {
  /** Chỉ fetch gallery SSR khi URL có `?view=gallery`. */
  includeGallery?: boolean;
};

/** Trang chủ đã đăng nhập — World Journey feed + sidebar khám phá. */
export async function HomeWorldJourneyMain({
  includeGallery = false,
}: Props) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.slug) return null;

  const { owner, error } = await fetchOwnerBySlug(session.profile.slug);
  if (error || !owner) return null;

  if (owner.giai_doan === null) {
    redirect("/onboarding");
  }

  const filterChips = buildWorldJourneyFilterChips();
  const linhVucs = mapLinhVucForGuestAside(await listLinhVucForHub());
  const giaiDoan = owner.giai_doan as GiaiDoan | null;
  const persona = resolvePersona(giaiDoan);

  const [feedPage, feedPromos, galleryPage] = await Promise.all([
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
  ]);

  const moduleCtx: HomeModuleCtx = {
    viewerId: session.profile.id,
    viewerSlug: owner.slug,
    persona,
    giaiDoan,
    seeking: resolveSeeking(giaiDoan),
  };

  const ownerAvatarUrl = getAvatarUrl(owner.avatar_id);

  return (
    <HomeWorldJourneyClient
      leftAside={
        <Suspense fallback={<HomeAsideSkeleton side="left" />}>
          <HomeModuleColumn side="left" ctx={moduleCtx} />
        </Suspense>
      }
      rightAside={
        <Suspense fallback={<HomeAsideSkeleton side="right" />}>
          <HomeModuleColumn side="right" ctx={moduleCtx} />
        </Suspense>
      }
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
    />
  );
}
