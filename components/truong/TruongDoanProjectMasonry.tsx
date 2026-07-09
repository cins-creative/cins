"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import {
  GALLERY_GRID_IMAGE_SIZES,
  galleryGridAssetFromCfUrl,
} from "@/lib/cloudflare/cf-variant-url";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import {
  displayMediaPostTitle,
  isGalleryVideoCoverSrc,
  isPostPermalinkHref,
} from "@/lib/journey/post-media";

const AVATAR_COLORS = [
  "#1F74C9",
  "#5C2BB6",
  "#0E5C3B",
  "#B5610C",
  "#B5446D",
  "#3A4255",
] as const;

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function useTruongDoanPostOverlay(returnPath: string) {
  const router = useRouter();
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const urlSyncedRef = useRef(false);

  const close = useCallback(() => {
    setMilestoneId(null);
    if (urlSyncedRef.current) {
      urlSyncedRef.current = false;
      router.replace(returnPath, { scroll: false });
    }
  }, [router, returnPath]);

  const openItem = useCallback((item: OrgDoanProjectItem) => {
    const id = item.cotMocId?.trim();
    if (!id) return;

    if (isPostPermalinkHref(item.href)) {
      window.history.pushState({ cinsDoanPost: id }, "", item.href);
      urlSyncedRef.current = true;
    }

    setMilestoneId(id);
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (!milestoneId) return;
      urlSyncedRef.current = false;
      setMilestoneId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [milestoneId]);

  const overlay = (
    <JourneyPostModal milestoneId={milestoneId} onClose={close} />
  );

  return { openItem, overlay };
}

function DoanStudentMeta({
  item,
  colorIndex,
}: {
  item: OrgDoanProjectItem;
  colorIndex: number;
}) {
  const avatarBg = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const metaEl = (
    <span className="tdh-doan-gallery-student">
      <span
        className="tdh-doan-gallery-student-avatar"
        style={item.studentAvatarUrl ? undefined : { background: avatarBg }}
        aria-hidden
      >
        {item.studentAvatarUrl ? (
          <JourneyCoverImage
            src={item.studentAvatarUrl}
            alt=""
            width={22}
            height={22}
            className="tdh-doan-gallery-student-avatar-img"
          />
        ) : (
          studentInitials(item.studentName)
        )}
      </span>
      <span className="tdh-doan-gallery-student-text">
        <span className="tdh-doan-gallery-student-name">{item.studentName}</span>
        {item.nganhLabel || item.nam ? (
          <span className="tdh-doan-gallery-student-nganh">
            {[item.nganhLabel, item.nam ? `Năm ${item.nam}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (item.studentSlug) {
    return (
      <JourneyUserPopover
        slug={item.studentSlug}
        fallbackName={item.studentName}
        fallbackAvatarUrl={item.studentAvatarUrl}
      >
        {metaEl}
      </JourneyUserPopover>
    );
  }

  return metaEl;
}

function DoanProjectCardHit({
  item,
  displayTitle,
}: {
  item: OrgDoanProjectItem;
  displayTitle: string;
}) {
  const hasImage = Boolean(item.coverSrc);
  const isVideo = item.isVideo ?? isGalleryVideoCoverSrc(item.coverSrc);
  const gridAsset = item.coverSrc
    ? galleryGridAssetFromCfUrl(item.coverSrc)
    : null;

  return (
    <>
      <div
        className="j-main-gallery-thumb"
        style={
          !hasImage && item.coverGradient
            ? { background: item.coverGradient }
            : undefined
        }
      >
        {hasImage ? (
          <JourneyCoverImage
            src={gridAsset?.src ?? item.coverSrc!}
            srcSet={gridAsset?.srcSet}
            sizes={gridAsset?.srcSet ? GALLERY_GRID_IMAGE_SIZES : undefined}
            alt={item.coverAlt ?? item.projectTitle}
            width={gridAsset?.width ?? 640}
            height={gridAsset?.height ?? 360}
            className="tdh-doan-gallery-img"
          />
        ) : (
          <span className="tdh-doan-gallery-initials" aria-hidden>
            {studentInitials(item.studentName)}
          </span>
        )}
        {isVideo ? <GalleryVideoPlayBadge /> : null}
      </div>
      <span className="j-main-gallery-info">
        <strong>{displayTitle}</strong>
      </span>
    </>
  );
}

function DoanProjectCard({
  item,
  colorIndex,
  onOpen,
}: {
  item: OrgDoanProjectItem;
  colorIndex: number;
  onOpen: (item: OrgDoanProjectItem) => void;
}) {
  const displayTitle = displayMediaPostTitle(item.projectTitle);

  return (
    <div className="j-main-gallery-item">
      <button
        type="button"
        className="tdh-doan-gallery-hit"
        aria-label={`Xem đồ án ${displayTitle}`}
        onClick={() => onOpen(item)}
      >
        <DoanProjectCardHit item={item} displayTitle={displayTitle} />
      </button>
      <div className="tdh-doan-gallery-meta">
        <DoanStudentMeta item={item} colorIndex={colorIndex} />
      </div>
    </div>
  );
}

type Props = {
  projects: OrgDoanProjectItem[];
};

export function TruongDoanProjectMasonry({ projects }: Props) {
  const pathname = usePathname();
  const returnPath = pathname.split("?")[0]?.split("#")[0] || pathname;
  const { openItem, overlay } = useTruongDoanPostOverlay(returnPath);

  if (!projects.length) return null;

  return (
    <>
      <div className="j-main-gallery-grid tdh-doan-gallery-grid" role="list">
        {projects.map((item, i) => (
          <DoanProjectCard
            key={item.id}
            item={item}
            colorIndex={i}
            onOpen={openItem}
          />
        ))}
      </div>
      {overlay}
    </>
  );
}
