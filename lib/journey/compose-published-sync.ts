"use client";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  invalidateMilestoneDetailCache,
  milestoneDetailCacheKey,
} from "@/lib/journey/milestone-detail-cache";
import { markJourneyOwnerPanelsStale } from "@/lib/journey/journey-panel-local-cache";
import { invalidatePostPageCache } from "@/lib/journey/post-local-cache";

export const COMPOSE_PUBLISHED_EVENT = "cins:compose-published";

export type ComposePublishedDetail = {
  ownerSlug: string;
  /** Profile id chủ bài — invalidate panel cache localStorage sau publish. */
  ownerProfileId?: string;
  postSlug?: string | null;
  tacPhamId?: string;
  cotMocId?: string;
  milestone?: MilestoneItem;
};

export function invalidateCachesAfterComposePublish(
  detail: Pick<ComposePublishedDetail, "ownerSlug" | "postSlug" | "cotMocId">,
): void {
  if (detail.postSlug) {
    invalidatePostPageCache(detail.ownerSlug, detail.postSlug);
    invalidateMilestoneDetailCache(
      milestoneDetailCacheKey(detail.ownerSlug, detail.postSlug),
    );
  }
  if (detail.cotMocId) {
    invalidateMilestoneDetailCache(
      milestoneDetailCacheKey(detail.ownerSlug, null, detail.cotMocId),
    );
  }
}

export function dispatchComposePublished(detail: ComposePublishedDetail): void {
  if (typeof window === "undefined") return;
  invalidateCachesAfterComposePublish(detail);
  if (detail.ownerProfileId) {
    markJourneyOwnerPanelsStale(detail.ownerSlug, detail.ownerProfileId);
  }
  window.dispatchEvent(
    new CustomEvent(COMPOSE_PUBLISHED_EVENT, { detail }),
  );
  window.dispatchEvent(
    new CustomEvent("cins:journey-timeline-changed", {
      detail: { ownerSlug: detail.ownerSlug },
    }),
  );
}
