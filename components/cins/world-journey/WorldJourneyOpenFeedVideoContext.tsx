"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { MilestoneItem } from "@/components/journey/milestone-types";

type OpenFeedVideo = (milestone: MilestoneItem) => void;

const WorldJourneyOpenFeedVideoContext = createContext<OpenFeedVideo | null>(
  null,
);

export function WorldJourneyOpenFeedVideoProvider({
  value,
  children,
}: {
  value: OpenFeedVideo;
  children: ReactNode;
}) {
  return (
    <WorldJourneyOpenFeedVideoContext.Provider value={value}>
      {children}
    </WorldJourneyOpenFeedVideoContext.Provider>
  );
}

/** Chỉ có trên trang chủ World Journey — click media Stream → Reels. */
export function useWorldJourneyOpenFeedVideo(): OpenFeedVideo | null {
  return useContext(WorldJourneyOpenFeedVideoContext);
}
