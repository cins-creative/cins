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

export function prefetchJourneyGalleryView() {
  void import("@/components/journey/JourneyGalleryGridView");
}

export function prefetchJourneyFriendsView() {
  void import("@/components/journey/JourneyFriendsView");
}

export function prefetchJourneyOrganizationsView() {
  void import("@/components/journey/JourneyOrganizationsView");
}
