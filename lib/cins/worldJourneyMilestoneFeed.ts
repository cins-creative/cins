import type { MilestoneItem } from "@/components/journey/milestone-types";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { articleCardHasExpandableContent } from "@/lib/journey/post-media";

export function worldJourneyMilestonePermalink(
  milestone: MilestoneItem,
): string | null {
  const slug = milestone.lensOwnerSlug ?? milestone.postOwnerSlug;
  if (!slug?.trim() || !milestone.postSlug?.trim()) return null;
  return `/${slug.trim()}/p/${milestone.postSlug.trim()}`;
}

export function worldJourneyMilestoneCardKind(
  milestone: MilestoneItem,
): ReturnType<typeof milestoneCardContentKind> {
  const hasCoverPreview = Boolean(milestone.media?.[0]?.src);
  return milestoneCardContentKind(
    milestone.noiDungBlocks,
    hasCoverPreview,
    milestone.body,
  );
}

/** Chỉ bài viết dài — unfold inline; ảnh/video mở lightbox/player trên card. */
export function canWorldJourneyInlineExpandOnFeed(
  milestone: MilestoneItem,
): boolean {
  if (milestone.orgSuKienRef) return false;
  if (worldJourneyMilestoneCardKind(milestone) !== "article") return false;
  return articleCardHasExpandableContent(
    milestone.body,
    milestone.noiDungBlocks,
  );
}

/** @deprecated — dùng `canWorldJourneyInlineExpandOnFeed`. */
export function canWorldJourneyInlineExpandArticle(
  milestone: MilestoneItem,
): boolean {
  return canWorldJourneyInlineExpandOnFeed(milestone);
}
