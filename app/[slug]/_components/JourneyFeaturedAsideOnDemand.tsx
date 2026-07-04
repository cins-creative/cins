"use client";

import { useCallback, useEffect, useState } from "react";

import { JourneyFeaturedAsideSectionSkeleton } from "@/app/[slug]/_components/JourneyFeaturedAsideSection.skeleton";
import {
  JourneyFeaturedAsidePanel,
} from "@/components/journey/JourneyFeaturedAsidePanel";
import type { GalleryPinnedBanner } from "@/components/journey/JourneyGalleryAside";
import { useJourneyView } from "@/components/journey/JourneyViewContext";

type AsidePayload = {
  pinned: GalleryPinnedBanner[];
};

/**
 * Cột gallery phải — chỉ fetch khi user chuyển sang Journey (server không prefetch).
 */
export function JourneyFeaturedAsideOnDemand({ ownerSlug }: { ownerSlug: string }) {
  const { view } = useJourneyView();
  const [pinned, setPinned] = useState<GalleryPinnedBanner[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/journey/${encodeURIComponent(ownerSlug)}/gallery-aside`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("aside fetch failed");
      const data = (await res.json()) as AsidePayload;
      setPinned(data.pinned ?? []);
    } catch {
      setPinned([]);
    } finally {
      setLoading(false);
    }
  }, [ownerSlug]);

  useEffect(() => {
    if (view !== "journey" || pinned !== null) return;
    void load();
  }, [view, pinned, load]);

  if (view !== "journey") return null;
  if (loading || pinned === null) {
    return <JourneyFeaturedAsideSectionSkeleton />;
  }

  return (
    <JourneyFeaturedAsidePanel ownerSlug={ownerSlug} initialPinned={pinned} />
  );
}
