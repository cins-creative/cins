"use client";

import { useCallback, useEffect, useState } from "react";

import {
  JourneyGalleryAside,
  type GalleryPinnedBanner,
} from "@/components/journey/JourneyGalleryAside";
import { useJourneyView } from "@/components/journey/JourneyViewContext";

type Props = {
  ownerSlug: string;
  initialPinned: ReadonlyArray<GalleryPinnedBanner>;
};

type AsidePayload = {
  pinned: GalleryPinnedBanner[];
  items: unknown[];
  totalTacPham: number;
};

export function JourneyFeaturedAsidePanel({
  ownerSlug,
  initialPinned,
}: Props) {
  const { view } = useJourneyView();
  const [pinned, setPinned] = useState<GalleryPinnedBanner[]>(() => [
    ...initialPinned,
  ]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/journey/${encodeURIComponent(ownerSlug)}/gallery-aside`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as AsidePayload;
      setPinned(data.pinned ?? []);
    } catch {
      /* ignore */
    }
  }, [ownerSlug]);

  useEffect(() => {
    setPinned([...initialPinned]);
  }, [initialPinned]);

  useEffect(() => {
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerSlug?: string }>).detail;
      if (detail?.ownerSlug && detail.ownerSlug !== ownerSlug) return;
      void refresh();
    };

    window.addEventListener("cins:journey-timeline-changed", onSync);
    window.addEventListener("cins:milestone-deleted", onSync);
    window.addEventListener("cins:video-ready", onSync);
    window.addEventListener("cins:journey-gallery-sync", onSync);
    return () => {
      window.removeEventListener("cins:journey-timeline-changed", onSync);
      window.removeEventListener("cins:milestone-deleted", onSync);
      window.removeEventListener("cins:video-ready", onSync);
      window.removeEventListener("cins:journey-gallery-sync", onSync);
    };
  }, [ownerSlug, refresh]);

  if (view !== "journey") return null;

  return (
    <JourneyGalleryAside
      ownerSlug={ownerSlug}
      totalTacPham={0}
      pinned={pinned}
      featuredOnly
    />
  );
}
