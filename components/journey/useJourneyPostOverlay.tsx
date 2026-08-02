"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import {
  CINS_HISTORY_POST,
  pushOverlayHistory,
  withSearchParam,
} from "@/lib/navigation/overlay-history";

type OpenOpts = {
  /** Permalink `/slug/p/postSlug` nếu có — ưu tiên hơn `?post=`. */
  href?: string | null;
};

/**
 * Overlay chi tiết bài (JourneyPostModal) + đồng bộ history.
 * Back trên mobile đóng overlay, không thoát trang nền.
 */
export function useJourneyPostOverlay() {
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const pushedRef = useRef(false);
  /** Bỏ qua popstate ngay sau `history.back()` từ nút Đóng. */
  const ignorePopRef = useRef(false);

  const closePost = useCallback(() => {
    setMilestoneId(null);
    if (pushedRef.current) {
      ignorePopRef.current = true;
      pushedRef.current = false;
      window.history.back();
    }
  }, []);

  const openPost = useCallback(
    (cotMocId: string | null | undefined, opts?: OpenOpts) => {
      const id = cotMocId?.trim();
      if (!id) return;

      const permalink = opts?.href?.trim() || null;
      const href = permalink
        ? permalink.startsWith("http")
          ? new URL(permalink).pathname + new URL(permalink).search
          : permalink
        : withSearchParam("post", id);

      pushOverlayHistory(CINS_HISTORY_POST, id, href);
      pushedRef.current = true;
      setMilestoneId(id);
    },
    [],
  );

  useEffect(() => {
    const onPop = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        pushedRef.current = false;
        return;
      }
      if (!milestoneId) return;
      pushedRef.current = false;
      setMilestoneId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [milestoneId]);

  const overlay =
    milestoneId != null ? (
      <JourneyPostModal milestoneId={milestoneId} onClose={closePost} />
    ) : null;

  return { openPost, closePost, overlay, activeMilestoneId: milestoneId };
}
