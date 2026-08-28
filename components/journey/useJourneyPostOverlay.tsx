"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import { shouldHardNavigate } from "@/lib/navigation/hard-nav";
import {
  CINS_HISTORY_POST,
  pushOverlayHistory,
  withSearchParam,
} from "@/lib/navigation/overlay-history";
import {
  blurOverlayFocus,
  captureOverlayPageScroll,
  pinOverlayPageScroll,
} from "@/lib/navigation/overlay-page-scroll";

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
    blurOverlayFocus();
    setMilestoneId(null);
    if (pushedRef.current) {
      ignorePopRef.current = true;
      pushedRef.current = false;
      window.history.back();
      pinOverlayPageScroll();
      queueMicrotask(pinOverlayPageScroll);
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

      /* Banner gallery: pushState permalink từ `?view=` → intercept RSC 404. */
      if (permalink) {
        const from = `${window.location.pathname}${window.location.search}`;
        if (shouldHardNavigate(from, href)) {
          window.location.assign(href);
          return;
        }
      }

      captureOverlayPageScroll();
      pushOverlayHistory(CINS_HISTORY_POST, id, href);
      pinOverlayPageScroll();
      queueMicrotask(pinOverlayPageScroll);
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
