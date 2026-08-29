import { JourneyProfileInstantFallback } from "@/app/[slug]/_components/JourneyProfileInstantFallback";
import { JourneyProfileShellClient } from "@/app/[slug]/_components/JourneyProfileShellClient";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import {
  JourneyProfileContent,
  type JourneyProfileInitialData,
} from "@/components/journey/JourneyProfileContent";
import type { JourneyProfileView } from "@/components/journey/JourneySidebar";
import type { AvatarFrameDto } from "@/lib/journey/avatar-frame";
import type { ShopSwitchDto } from "@/lib/journey/shop-switch";
import type { GiaiDoan } from "@/lib/auth/session";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import type { JourneyComposeState } from "@/lib/journey/compose-types";
import {
  getCachedGalleryMainPage,
  getCachedJourneySwitchNavCounts,
  getCachedMilestoneTimelinePage,
  getCachedMutualFriendsPage,
  getCachedPendingCoAuthorInvites,
  getCachedPendingCoSoStaffInvites,
  getCachedOutboundMembershipPending,
} from "@/lib/journey/journey-page-cache";
import { fetchUserOrganizationsPage } from "@/lib/journey/user-orgs-fetch";
import { Suspense } from "react";

import type { KetBanStatusSummary } from "@/lib/social/types";

import { JourneyFeaturedAsideSection } from "@/app/[slug]/_components/JourneyFeaturedAsideSection";
import { JourneyFeaturedAsideOnDemand } from "@/app/[slug]/_components/JourneyFeaturedAsideOnDemand";
import { JourneyFeaturedAsideSectionSkeleton } from "@/app/[slug]/_components/JourneyFeaturedAsideSection.skeleton";
import { SoftErrorBoundary } from "@/components/cins/SoftErrorBoundary";
import { getShopCuaHangByUserId } from "@/lib/shop/cua-hang";
import { toPublicShop, type ShopCuaHang } from "@/lib/shop/types";

type OwnerRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  ai_summary_journey: string | null;
  giai_doan: GiaiDoan | null;
  tinh_thanh: string | null;
  email_lien_he: string | null;
  mxh_links: unknown;
};

type Props = {
  activeView: JourneyProfileView;
  owner: OwnerRow;
  ownerAvatarUrl: string | null;
  ownerCoverUrl: string | null;
  /** Khung avatar từ giao_dien — null = mặc định. */
  ownerAvatarFrame?: AvatarFrameDto | null;
  emailForView: string | null;
  ownerName: string;
  isOwner: boolean;
  /** Admin được sửa bài nick seeding như chủ — không mở khoá hồ sơ. */
  adminSeedingEdit?: boolean;
  viewerProfileId: string | null;
  initialKetBanStatus?: KetBanStatusSummary | null;
  filterVisibility: LoaiMocVisibilityMap;
  editProfileInitial?: EditProfileInitial;
  initialCompose?: JourneyComposeState | null;
  /** Hiện tab Shop (bật bán hàng, hoặc chính chủ). */
  showShop?: boolean;
  ownerShopSwitch?: ShopSwitchDto | null;
  /** Chi tiết loại hàng trong panel shop (`/{slug}/shop/{shopSlug}/collections/...`). */
  shopNhomId?: string | null;
};

async function loadInitialData(
  activeView: JourneyProfileView,
  params: {
    ownerId: string;
    ownerSlug: string;
    isOwner: boolean;
    viewerProfileId: string | null;
  },
): Promise<JourneyProfileInitialData> {
  const { ownerId, ownerSlug, isOwner, viewerProfileId } = params;

  if (activeView === "gallery") {
    const gallery = await getCachedGalleryMainPage({
      userId: ownerId,
      ownerSlug,
      viewerId: viewerProfileId,
      offset: 0,
    });
    return { gallery };
  }

  if (activeView === "friends") {
    const friends = await getCachedMutualFriendsPage(ownerId, { offset: 0 });
    return { friends };
  }

  if (activeView === "organizations") {
    const organizations = await fetchUserOrganizationsPage(ownerId);
    return { organizations };
  }

  if (activeView === "shop") {
    return {};
  }

  const [page, coAuthorPendingInvites, coSoStaffPendingInvites, membershipPendingOutbound] =
    await Promise.all([
    getCachedMilestoneTimelinePage({
      userId: ownerId,
      isOwner,
      viewerId: viewerProfileId,
      offset: 0,
    }),
    isOwner && viewerProfileId
      ? getCachedPendingCoAuthorInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedPendingCoSoStaffInvites(viewerProfileId)
      : Promise.resolve([]),
    isOwner && viewerProfileId
      ? getCachedOutboundMembershipPending(viewerProfileId)
      : Promise.resolve([]),
  ]);

  return {
    timeline: {
      page,
      coAuthorPendingInvites,
      coSoStaffPendingInvites,
      membershipPendingOutbound,
    },
  };
}

async function JourneyProfileInitialLoader({
  activeView,
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
  ownerAvatarId,
  isOwner,
  viewerProfileId,
  filterVisibility,
  shopNhomId = null,
}: {
  activeView: JourneyProfileView;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerAvatarId: string | null;
  isOwner: boolean;
  viewerProfileId: string | null;
  filterVisibility: LoaiMocVisibilityMap;
  shopNhomId?: string | null;
}) {
  let initialData: JourneyProfileInitialData;
  try {
    initialData = await loadInitialData(activeView, {
      ownerId,
      ownerSlug,
      isOwner,
      viewerProfileId,
    });
  } catch (err) {
    console.error("[journey-profile] loadInitialData", err);
    initialData = {};
  }

  const initialShop =
    activeView === "shop"
      ? await getShopCuaHangByUserId(ownerId)
          .then((s) => (s ? (isOwner ? s : toPublicShop(s)) : null))
          .catch((err) => {
            console.error("[journey-profile] shop", err);
            return null;
          })
      : null;

  return (
    <JourneyProfileContent
      initialData={initialData}
      ownerId={ownerId}
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl}
      ownerAvatarId={ownerAvatarId}
      isOwner={isOwner}
      viewerProfileId={viewerProfileId}
      filterVisibility={filterVisibility}
      shopNhomId={shopNhomId}
      initialShop={initialShop}
    />
  );
}

export function JourneyProfileShell({
  activeView,
  owner,
  ownerAvatarUrl,
  ownerCoverUrl,
  ownerAvatarFrame = null,
  emailForView,
  ownerName,
  isOwner,
  adminSeedingEdit = false,
  viewerProfileId,
  initialKetBanStatus = null,
  filterVisibility,
  editProfileInitial,
  initialCompose = null,
  showShop = false,
  ownerShopSwitch = null,
  shopNhomId = null,
}: Props) {
  const countsPromise = Promise.all([
    getCachedJourneySwitchNavCounts({ ownerId: owner.id })
      .then(({ friendCount, orgCount }) => ({ friendCount, orgCount }))
      .catch((err) => {
        console.error("[journey-profile] switch-nav counts", err);
        return { friendCount: 0, orgCount: 0 };
      }),
    showShop
      ? getShopCuaHangByUserId(owner.id)
          .then((shop) => {
            if (!shop) return null;
            return isOwner ? shop : toPublicShop(shop);
          })
          .catch((err) => {
            console.error("[journey-profile] switch-nav shop", err);
            return null;
          })
      : Promise.resolve(null as ShopCuaHang | null),
  ]).then(([counts, shop]) => ({
    friendCount: counts.friendCount,
    orgCount: counts.orgCount,
    shop,
  }));

  return (
    <JourneyProfileShellClient
      activeView={activeView}
      profile={{
        id: owner.id,
        slug: owner.slug,
        tenHienThi: owner.ten_hien_thi,
        avatarUrl: ownerAvatarUrl,
        coverUrl: ownerCoverUrl,
        bio: owner.bio,
        tinhThanh: owner.tinh_thanh,
        emailLienHe: emailForView,
        mxhLinks: owner.mxh_links,
        aiSummaryJourney: owner.ai_summary_journey,
        giaiDoan: owner.giai_doan,
        avatarFrame: ownerAvatarFrame,
      }}
      ownerId={owner.id}
      ownerAvatarId={owner.avatar_id}
      isOwner={isOwner}
      adminSeedingEdit={adminSeedingEdit}
      editProfileInitial={editProfileInitial}
      viewerProfileId={viewerProfileId}
      initialKetBanStatus={initialKetBanStatus}
      initialCompose={initialCompose}
      countsPromise={countsPromise}
      showShop={showShop}
      ownerShopSwitch={ownerShopSwitch}
      mainPanel={
        <SoftErrorBoundary message="Không tải được nội dung trang.">
          <Suspense
            fallback={
              <JourneyProfileInstantFallback
                ownerSlug={owner.slug}
                ownerId={owner.id}
                ownerName={ownerName}
                ownerAvatarUrl={ownerAvatarUrl}
                isOwner={isOwner}
                viewerProfileId={viewerProfileId}
                filterVisibility={filterVisibility}
              />
            }
          >
            <JourneyProfileInitialLoader
              activeView={activeView}
              ownerId={owner.id}
              ownerSlug={owner.slug}
              ownerName={ownerName}
              ownerAvatarUrl={ownerAvatarUrl}
              ownerAvatarId={owner.avatar_id}
              isOwner={isOwner}
              viewerProfileId={viewerProfileId}
              filterVisibility={filterVisibility}
              shopNhomId={shopNhomId}
            />
          </Suspense>
        </SoftErrorBoundary>
      }
      featuredAside={
        activeView === "journey" ? (
          <SoftErrorBoundary message="Không tải được bài nổi bật.">
            <Suspense fallback={<JourneyFeaturedAsideSectionSkeleton />}>
              <JourneyFeaturedAsideSection
                ownerId={owner.id}
                ownerSlug={owner.slug}
                isOwner={isOwner}
                viewerId={viewerProfileId}
              />
            </Suspense>
          </SoftErrorBoundary>
        ) : (
          <JourneyFeaturedAsideOnDemand
            ownerSlug={owner.slug}
            isOwner={isOwner}
          />
        )
      }
    />
  );
}
