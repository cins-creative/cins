"use client";

import { JourneyFriendsSectionSkeleton } from "@/app/[slug]/_components/JourneyFriendsSection.skeleton";
import { JourneyGalleryMainSectionSkeleton } from "@/app/[slug]/_components/JourneyGalleryMainSection.skeleton";
import { JourneyTimelineSectionSkeleton } from "@/app/[slug]/_components/JourneyTimelineSection.skeleton";
import { useJourneyView } from "@/components/journey/JourneyViewContext";

export function JourneyMainPanelSkeleton() {
  const { view } = useJourneyView();

  if (view === "gallery") return <JourneyGalleryMainSectionSkeleton />;
  if (view === "friends") return <JourneyFriendsSectionSkeleton />;

  return <JourneyTimelineSectionSkeleton />;
}
