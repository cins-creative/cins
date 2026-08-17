import type { MilestoneItem } from "@/components/journey/milestone-types";
import { worldJourneyMilestonePermalink } from "@/lib/cins/worldJourneyMilestoneFeed";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { extractVideoCanvasRatio } from "@/lib/journey/video-canvas-ratio";
import {
  resolveVideoPreviewMp4FromBlocks,
  resolveVideoThumbnailFromBlocks,
  streamUidFromBlocks,
} from "@/lib/journey/video-embed";

/** Cloudflare Stream UID trên bài feed — điều kiện mở Reels. */
export function feedMilestoneStreamUid(
  milestone: MilestoneItem,
): string | null {
  return streamUidFromBlocks(milestone.noiDungBlocks);
}

/** Id clip khớp tab Video (`feat-{cotMocId}` / `org-post-{id}`). */
export function feedMilestoneVideoPlayId(
  milestone: MilestoneItem,
): string | null {
  if (!feedMilestoneStreamUid(milestone)) return null;
  const orgPostId = milestone.orgBaiDangRef?.postId?.trim();
  if (orgPostId) return `org-post-${orgPostId}`;
  const cotMocId = (milestone.cotMocId ?? milestone.id)?.trim();
  if (!cotMocId) return null;
  return `feat-${cotMocId}`;
}

/** Snapshot đủ để Reels phát ngay từ card timeline (không chờ listing). */
export function galleryItemFromFeedMilestone(
  milestone: MilestoneItem,
): GalleryMainItem | null {
  const streamUid = feedMilestoneStreamUid(milestone);
  const id = feedMilestoneVideoPlayId(milestone);
  if (!streamUid || !id) return null;

  const orgPostId = milestone.orgBaiDangRef?.postId?.trim() || null;
  const cotMocId = (milestone.cotMocId ?? milestone.id)?.trim() || orgPostId;
  if (!cotMocId) return null;

  const preview = milestone.media?.[0];
  const poster =
    resolveVideoThumbnailFromBlocks(milestone.noiDungBlocks) ||
    preview?.src?.trim() ||
    "";
  const communityName = milestone.congDongOrg?.name?.trim() || null;
  const href =
    worldJourneyMilestonePermalink(milestone) ??
    milestone.congDongOrg?.href ??
    undefined;

  return {
    id,
    cotMocId,
    src: poster,
    srcSet: preview?.srcSet,
    width: preview?.width,
    height: preview?.height,
    objectPosition: preview?.objectPosition,
    label: milestone.title,
    href,
    meta: communityName
      ? `Cộng đồng · ${communityName}`
      : milestone.visibility === "feature"
        ? "Nổi bật"
        : "",
    featured: milestone.visibility === "feature",
    type: milestone.type,
    visibility: milestone.visibility,
    postSlug: milestone.postSlug,
    postOwnerSlug: milestone.postOwnerSlug ?? milestone.lensOwnerSlug ?? null,
    tacPhamId: milestone.tacPhamId ?? orgPostId,
    variant: milestone.variant,
    mediaKind: "video",
    isVideo: true,
    streamUid,
    videoPreviewSrc: resolveVideoPreviewMp4FromBlocks(milestone.noiDungBlocks),
    videoCanvasRatio: extractVideoCanvasRatio(milestone.noiDungBlocks) ?? undefined,
    authorName: milestone.lensOwnerName ?? null,
    authorAvatarUrl: milestone.lensOwnerAvatarUrl ?? null,
    authorSlug: milestone.lensOwnerSlug ?? null,
    orgKicker: communityName
      ? "Cộng đồng"
      : milestone.visibility === "feature"
        ? "Nổi bật"
        : null,
    feedSource: milestone.feedSource,
    feedFollowing: milestone.feedFollowing,
    congDongOrg: milestone.congDongOrg ?? null,
  };
}
