"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import {
  GalleryItemVisual,
  GalleryVideoPlayBadge,
} from "@/components/journey/GalleryItemVisual";
import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import {
  GALLERY_GRID_IMAGE_SIZES,
  galleryGridAssetFromCfUrl,
  isCfDeliveryUrl,
  swapCfImageVariant,
} from "@/lib/cloudflare/cf-variant-url";
import {
  getCachedVideoAspect,
  subscribeVideoAspectCache,
} from "@/lib/journey/gallery-video-dimension-cache";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import {
  displayMediaPostTitle,
  isGalleryVideoCoverSrc,
  isPostPermalinkHref,
} from "@/lib/journey/post-media";
import { probeImageDimensions } from "@/lib/journey/probe-image-dimensions";
import { probeRemoteVideoDimensions } from "@/lib/journey/probe-remote-video-dimensions";

const AVATAR_COLORS = [
  "#1F74C9",
  "#5C2BB6",
  "#0E5C3B",
  "#B5610C",
  "#B5446D",
  "#3A4255",
] as const;

const FALLBACK_ASPECT = 16 / 9;

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/** Masonry: `/public` giữ khung gốc — không dùng `/grid` (crop 16:9). */
function masonryThumbSrc(coverSrc: string): string {
  if (isCfDeliveryUrl(coverSrc)) {
    return swapCfImageVariant(coverSrc, "public");
  }
  return coverSrc;
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

/** Probe tỉ lệ thật — `tile` chỉ là pattern trang trí, không dùng cho masonry. */
function useDoanMasonryAspects(
  projects: readonly OrgDoanProjectItem[],
  enabled: boolean,
): ReadonlyMap<string, number> {
  const [aspectById, setAspectById] = useState<Map<string, number>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!enabled) {
      setAspectById(new Map());
      return;
    }

    const seeded = new Map(
      projects.map((item) => [item.id, FALLBACK_ASPECT]),
    );
    setAspectById(seeded);

    let cancelled = false;

    void (async () => {
      const results = await Promise.all(
        projects.map(async (item) => {
          const coverSrc = item.coverSrc?.trim() || "";
          const isVideo =
            item.isVideo ?? isGalleryVideoCoverSrc(coverSrc || null);

          if (isVideo) {
            const mp4 = item.videoPreviewSrc?.trim();
            if (mp4) {
              const cached = getCachedVideoAspect(mp4);
              if (cached) return { id: item.id, aspect: cached };
              const dim = await probeRemoteVideoDimensions(mp4);
              if (dim && dim.width > 0 && dim.height > 0) {
                return {
                  id: item.id,
                  aspect: dim.width / dim.height,
                };
              }
            }
            return { id: item.id, aspect: FALLBACK_ASPECT };
          }

          if (!coverSrc) return { id: item.id, aspect: FALLBACK_ASPECT };
          const src = masonryThumbSrc(coverSrc);
          const dim = await probeImageDimensions(src);
          if (dim && dim.width > 0 && dim.height > 0) {
            return { id: item.id, aspect: dim.width / dim.height };
          }
          return { id: item.id, aspect: FALLBACK_ASPECT };
        }),
      );
      if (cancelled) return;
      setAspectById(new Map(results.map((r) => [r.id, r.aspect])));
    })();

    const unsubCache = subscribeVideoAspectCache(() => {
      if (cancelled) return;
      setAspectById((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const item of projects) {
          const coverSrc = item.coverSrc?.trim() || "";
          const isVideo =
            item.isVideo ?? isGalleryVideoCoverSrc(coverSrc || null);
          if (!isVideo) continue;
          const mp4 = item.videoPreviewSrc?.trim();
          if (!mp4) continue;
          const cached = getCachedVideoAspect(mp4);
          if (!cached || next.get(item.id) === cached) continue;
          next.set(item.id, cached);
          changed = true;
        }
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
      unsubCache();
    };
  }, [enabled, projects]);

  return aspectById;
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
            width={32}
            height={32}
            className="tdh-doan-gallery-student-avatar-img"
          />
        ) : (
          studentInitials(item.studentName)
        )}
      </span>
      <span className="tdh-doan-gallery-student-text">
        <span className="tdh-doan-gallery-student-name">{item.studentName}</span>
        {item.nganhLabel || item.monHocLabel || item.nam ? (
          <span className="tdh-doan-gallery-student-nganh">
            {[
              item.nganhLabel,
              item.monHocLabel,
              item.nam ? `Năm ${item.nam}` : null,
            ]
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
  layout,
  thumbAspect,
}: {
  item: OrgDoanProjectItem;
  displayTitle: string;
  layout: "card" | "masonry";
  thumbAspect?: number;
}) {
  const coverSrc = item.coverSrc?.trim() || "";
  const isVideo = item.isVideo ?? isGalleryVideoCoverSrc(coverSrc || null);
  const isMasonry = layout === "masonry";
  const gridAsset = coverSrc ? galleryGridAssetFromCfUrl(coverSrc) : null;
  const thumbSrc = isMasonry
    ? coverSrc
      ? masonryThumbSrc(coverSrc)
      : ""
    : (gridAsset?.src ?? coverSrc);
  const hasVisual = Boolean(thumbSrc) || isVideo;
  const aspect = thumbAspect && thumbAspect > 0 ? thumbAspect : FALLBACK_ASPECT;
  const thumbStyle: CSSProperties | undefined = (() => {
    if (isMasonry) return { aspectRatio: String(aspect) };
    if (!hasVisual && item.coverGradient) {
      return { background: item.coverGradient };
    }
    return undefined;
  })();

  const imgWidth = isMasonry ? 800 : (gridAsset?.width ?? 640);
  const imgHeight = isMasonry
    ? Math.round(800 / aspect)
    : (gridAsset?.height ?? 360);

  return (
    <>
      <div className="j-main-gallery-thumb" style={thumbStyle}>
        {hasVisual ? (
          <GalleryItemVisual
            src={thumbSrc}
            srcSet={isMasonry ? undefined : gridAsset?.srcSet}
            sizes={
              !isMasonry && gridAsset?.srcSet
                ? GALLERY_GRID_IMAGE_SIZES
                : undefined
            }
            alt={item.coverAlt ?? item.projectTitle}
            width={imgWidth}
            height={imgHeight}
            isVideo={isVideo}
            videoPreviewSrc={item.videoPreviewSrc}
          />
        ) : (
          <span className="tdh-doan-gallery-initials" aria-hidden>
            {studentInitials(item.studentName)}
          </span>
        )}
        {isVideo ? <GalleryVideoPlayBadge /> : null}
      </div>
      {isMasonry ? (
        <span className="j-main-gallery-overlay" aria-hidden>
          <span className="j-main-gallery-overlay-title">{displayTitle}</span>
        </span>
      ) : (
        <span className="j-main-gallery-info">
          <strong>{displayTitle}</strong>
        </span>
      )}
    </>
  );
}

function DoanProjectCard({
  item,
  colorIndex,
  layout,
  thumbAspect,
  onOpen,
}: {
  item: OrgDoanProjectItem;
  colorIndex: number;
  layout: "card" | "masonry";
  thumbAspect?: number;
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
        <DoanProjectCardHit
          item={item}
          displayTitle={displayTitle}
          layout={layout}
          thumbAspect={thumbAspect}
        />
      </button>
      {layout === "card" ? (
        <div className="tdh-doan-gallery-meta">
          <DoanStudentMeta item={item} colorIndex={colorIndex} />
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  projects: OrgDoanProjectItem[];
  /** `card` = dạng thẻ (mặc định) · `masonry` = lưới gọn. */
  layout?: "card" | "masonry";
};

export function TruongDoanProjectMasonry({
  projects,
  layout = "card",
}: Props) {
  const pathname = usePathname();
  const returnPath = pathname.split("?")[0]?.split("#")[0] || pathname;
  const { openItem, overlay } = useTruongDoanPostOverlay(returnPath);
  const isMasonry = layout === "masonry";
  const aspectById = useDoanMasonryAspects(projects, isMasonry);

  if (!projects.length) return null;

  const gridClass = isMasonry
    ? "j-main-gallery-grid j-main-gallery-grid--masonry tdh-doan-gallery-grid"
    : "j-main-gallery-grid j-main-gallery-grid--card tdh-doan-gallery-grid";

  return (
    <>
      <div className={gridClass} role="list">
        {projects.map((item, i) => (
          <DoanProjectCard
            key={item.id}
            item={item}
            colorIndex={i}
            layout={layout}
            thumbAspect={
              isMasonry ? aspectById.get(item.id) : undefined
            }
            onOpen={openItem}
          />
        ))}
      </div>
      {overlay}
    </>
  );
}
