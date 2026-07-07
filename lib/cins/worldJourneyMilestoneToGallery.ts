import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { galleryGridAssetFromCfUrl } from "@/lib/cloudflare/cf-variant-url";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import { resolveBunnyVideoPreviewMp4FromBlocks } from "@/lib/journey/video-embed";
import {
  extractVideoCanvasRatio,
  videoPreviewDimensionsFromRatio,
} from "@/lib/journey/video-canvas-ratio";
import {
  galleryItemExcerptLine,
  galleryItemLabel,
} from "@/lib/journey/post-media";

function isOrgCreateGalleryItem(m: MilestoneItem): boolean {
  return (
    m.cardLayout === "cong-dong-create" ||
    m.cardLayout === "co-so-create" ||
    m.cardLayout === "studio-create"
  );
}

function postHref(m: MilestoneItem): string | undefined {
  const slug = m.lensOwnerSlug ?? m.postOwnerSlug;
  if (!slug || !m.postSlug) return undefined;
  return `/${slug}/p/${m.postSlug}`;
}

/** Map milestone feed → gallery grid cards (cùng shape `GalleryMainItem`). */
export function worldJourneyMilestonesToGalleryItems(
  milestones: ReadonlyArray<MilestoneItem>,
): GalleryMainItem[] {
  const out: GalleryMainItem[] = [];

  milestones.forEach((m, i) => {
    const cotMocId = m.cotMocId ?? m.id;
    const isOrgCreate = isOrgCreateGalleryItem(m);
    const gridEntry = resolvePostGridEntry({
      moTa: m.tacPhamMoTa ?? m.body,
      coverId: m.tacPhamCoverId,
      hasCover: Boolean(m.media?.[0]?.src),
      blocks: m.noiDungBlocks ?? [],
    });
    const thumb = m.media?.[0];
    const isVideo = gridEntry?.mediaKind === "video" || Boolean(thumb?.isVideo);

    if (!isOrgCreate && !gridEntry) return;
    if (!isOrgCreate && !thumb?.src && !isVideo) return;

    const featured = m.visibility === "feature";
    const meta =
      galleryItemExcerptLine(m.body, m.tacPhamMoTa, m.noiDungBlocks ?? null) ||
      m.org?.trim() ||
      "";

    const gridAsset =
      thumb?.src && !isVideo ? galleryGridAssetFromCfUrl(thumb.src) : null;
    const mediaKind = gridEntry?.mediaKind ?? (isVideo ? "video" : "article");
    const videoCanvasRatio = isVideo
      ? (extractVideoCanvasRatio(m.noiDungBlocks ?? []) ?? undefined)
      : undefined;
    const videoDims = videoCanvasRatio
      ? videoPreviewDimensionsFromRatio(videoCanvasRatio)
      : null;

    out.push({
      id: `wj-grid-${cotMocId}-${i}`,
      cotMocId,
      personalFilterSlugs: m.personalFilterSlugs,
      personalFilters: m.personalFilters,
      src: gridAsset?.src ?? thumb?.src ?? "",
      srcSet: gridAsset?.srcSet ?? thumb?.srcSet,
      width: gridAsset?.width ?? videoDims?.width ?? thumb?.width,
      height: gridAsset?.height ?? videoDims?.height ?? thumb?.height,
      label: isOrgCreate
        ? m.title
        : galleryItemLabel(m.title, mediaKind),
      href: isOrgCreate
        ? (m.orgHref ?? undefined)
        : postHref(m),
      meta,
      featured,
      type: m.type,
      variant: m.variant,
      mediaKind,
      isVideo,
      videoProcessing: gridEntry?.videoProcessing,
      videoPreviewSrc: isVideo
        ? (gridEntry?.videoPreviewSrc ??
          resolveBunnyVideoPreviewMp4FromBlocks(m.noiDungBlocks ?? []))
        : null,
      videoCanvasRatio,
      cardLayout: m.cardLayout,
      orgAvatarUrl:
        m.attribution?.avatarUrl ??
        m.congDongOrg?.avatarUrl ??
        null,
      orgKicker: m.org ?? m.congDongOrg?.name ?? null,
      authorName:
        m.lensOwnerName ??
        m.attribution?.name ??
        m.congDongOrg?.name ??
        null,
      authorAvatarUrl:
        m.lensOwnerAvatarUrl ??
        m.attribution?.avatarUrl ??
        m.congDongOrg?.avatarUrl ??
        null,
    });
  });

  return out;
}
