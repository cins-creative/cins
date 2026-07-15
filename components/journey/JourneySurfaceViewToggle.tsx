"use client";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import { useJourneyView } from "@/components/journey/JourneyViewContext";
import { prefetchJourneyGalleryView } from "@/components/journey/journey-profile-lazy-views";

/**
 * Cụm 3 view nội dung trên Journey: timeline · dạng thẻ · lưới gọn (masonry).
 */
export function JourneySurfaceViewToggle() {
  const { contentSurface, setContentSurface } = useJourneyView();

  return (
    <ContentSurfaceViewToggle
      view={contentSurface}
      onViewChange={setContentSurface}
      onPrefetchGrid={prefetchJourneyGalleryView}
    />
  );
}
