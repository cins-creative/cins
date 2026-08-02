"use client";

import { useCallback, useState } from "react";

import { JourneyPostModal } from "@/components/journey/JourneyPostModal";

export function useJourneyPostOverlay() {
  const [milestoneId, setMilestoneId] = useState<string | null>(null);

  const openPost = useCallback((cotMocId: string | null | undefined) => {
    const id = cotMocId?.trim();
    if (!id) return;
    setMilestoneId(id);
  }, []);

  const closePost = useCallback(() => {
    setMilestoneId(null);
  }, []);

  const overlay =
    milestoneId != null ? (
      <JourneyPostModal milestoneId={milestoneId} onClose={closePost} />
    ) : null;

  return { openPost, closePost, overlay, activeMilestoneId: milestoneId };
}
