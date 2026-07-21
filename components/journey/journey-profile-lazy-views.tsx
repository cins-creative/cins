"use client";

import dynamic from "next/dynamic";

import { JourneyGalleryMainSectionSkeleton } from "@/app/[slug]/_components/JourneyGalleryMainSection.skeleton";
import { JourneyFriendsSectionSkeleton } from "@/app/[slug]/_components/JourneyFriendsSection.skeleton";
import { JourneyOrganizationsSectionSkeleton } from "@/app/[slug]/_components/JourneyOrganizationsSection.skeleton";

export const JourneyGalleryGridViewLazy = dynamic(
  () =>
    import("@/components/journey/JourneyGalleryGridView").then(
      (m) => m.JourneyGalleryGridView,
    ),
  { loading: () => <JourneyGalleryMainSectionSkeleton /> },
);

export const JourneyFriendsViewLazy = dynamic(
  () =>
    import("@/components/journey/JourneyFriendsView").then(
      (m) => m.JourneyFriendsView,
    ),
  { loading: () => <JourneyFriendsSectionSkeleton /> },
);

export const JourneyOrganizationsViewLazy = dynamic(
  () =>
    import("@/components/journey/JourneyOrganizationsView").then(
      (m) => m.JourneyOrganizationsView,
    ),
  { loading: () => <JourneyOrganizationsSectionSkeleton /> },
);

export const JourneyShopViewLazy = dynamic(
  () =>
    import("@/components/journey/JourneyShopView").then((m) => m.JourneyShopView),
  {
    loading: () => (
      <section className="j-shop" aria-busy="true">
        <div className="j-shop-loading">Đang tải cửa hàng…</div>
      </section>
    ),
  },
);

export const JourneyShopLoaiClientLazy = dynamic(
  () =>
    import("@/components/journey/JourneyShopLoaiClient").then(
      (m) => m.JourneyShopLoaiClient,
    ),
  {
    loading: () => (
      <section className="j-shop" aria-busy="true">
        <div className="j-shop-loading">Đang tải loại hàng…</div>
      </section>
    ),
  },
);

export function prefetchJourneyGalleryView() {
  void import("@/components/journey/JourneyGalleryGridView");
}

export function prefetchJourneyFriendsView() {
  void import("@/components/journey/JourneyFriendsView");
}

export function prefetchJourneyOrganizationsView() {
  void import("@/components/journey/JourneyOrganizationsView");
}

export function prefetchJourneyShopView() {
  void import("@/components/journey/JourneyShopView");
}
