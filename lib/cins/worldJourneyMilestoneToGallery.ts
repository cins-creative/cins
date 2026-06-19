import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import {
  galleryItemExcerptLine,
  galleryItemLabel,
  galleryMediaKindFromBlocks,
} from "@/lib/journey/post-media";

function isOrgCreateGalleryItem(m: MilestoneItem): boolean {
  return (
    m.cardLayout === "cong-dong-create" || m.cardLayout === "co-so-create"
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
    const mediaKind = galleryMediaKindFromBlocks(m.noiDungBlocks);
    const thumb = m.media?.[0];
    const isVideo = mediaKind === "video" || Boolean(thumb?.isVideo);

    if (!isOrgCreate && !thumb?.src && !isVideo) return;

    const featured = m.visibility === "feature";
    const meta =
      galleryItemExcerptLine(m.body, null, m.noiDungBlocks ?? null) ||
      m.org?.trim() ||
      "";

    out.push({
      id: `wj-grid-${cotMocId}-${i}`,
      cotMocId,
      personalFilterSlugs: m.personalFilterSlugs,
      personalFilters: m.personalFilters,
      src: thumb?.src ?? "",
      srcSet: thumb?.srcSet,
      width: thumb?.width,
      height: thumb?.height,
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
      cardLayout: m.cardLayout,
      orgAvatarUrl:
        m.attribution?.avatarUrl ??
        m.congDongOrg?.avatarUrl ??
        null,
      orgKicker: m.org ?? m.congDongOrg?.name ?? null,
    });
  });

  return out;
}
