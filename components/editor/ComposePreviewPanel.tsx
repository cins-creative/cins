"use client";

import {
  Bookmark,
  ChevronUp,
  Eye,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  MessageCircle,
  Rows3,
  Share2,
  ThumbsDown,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";
import { GalleryMainHoverOverlay } from "@/components/journey/GalleryMainHoverOverlay";
import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import {
  buildComposePreviewSnapshot,
  type ComposePreviewDraft,
  type ComposePreviewSnapshot,
} from "@/lib/journey/compose-preview-adapter";
import {
  coverThumbAspectCss,
  coverThumbAspectRatio,
  coverThumbObjectPosition,
  coverThumbZoom,
  DEFAULT_COVER_THUMB_META,
} from "@/lib/journey/cover-thumb";
import { articleCardHasExpandableContent } from "@/lib/journey/post-media";
import { getNameInitials } from "@/lib/journey/profile";

import "@/app/[slug]/journey/image-grid.css";

export type ComposePreviewTab = "journey" | "gallery" | "masonry";

type Props = {
  draft: ComposePreviewDraft;
  /** Mobile: panel đang mở dạng drawer. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const TABS: {
  id: ComposePreviewTab;
  label: string;
  Icon: typeof Rows3;
}[] = [
  { id: "journey", label: "Journey", Icon: Rows3 },
  { id: "gallery", label: "Gallery", Icon: LayoutGrid },
  { id: "masonry", label: "Masonry", Icon: ImageIcon },
];

const MOCK_NEIGHBOR_ASPECTS = [0.75, 1.15, 0.9, 1.35, 0.68, 1.05];

function PreviewThumb({
  src,
  alt,
  isVideo,
  aspect,
  className = "",
  objectPosition,
  zoom,
}: {
  src: string | null;
  alt: string;
  isVideo?: boolean;
  aspect?: number | string;
  className?: string;
  objectPosition?: string;
  zoom?: number;
}) {
  const style: CSSProperties | undefined = aspect
    ? { aspectRatio: String(aspect) }
    : undefined;
  const imgStyle: CSSProperties | undefined = (() => {
    const z = typeof zoom === "number" && zoom > 1.001 ? zoom : 1;
    if (!objectPosition && z <= 1.001) return undefined;
    const next: CSSProperties = {};
    if (objectPosition) next.objectPosition = objectPosition;
    if (z > 1.001) {
      next.transform = `scale(${z})`;
      next.transformOrigin = objectPosition || "50% 50%";
    }
    return next;
  })();

  return (
    <div className={`ed-cp-thumb ${className}`.trim()} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview blob/CF live
        <img
          src={src}
          alt={alt}
          loading="lazy"
          style={imgStyle}
        />
      ) : (
        <span className="ed-cp-thumb-empty" aria-hidden>
          {isVideo ? "Video" : "Chưa có ảnh"}
        </span>
      )}
      {isVideo ? (
        <span className="ed-cp-play" aria-hidden>
          ▶
        </span>
      ) : null}
    </div>
  );
}

function MockNeighbor({
  aspect = 16 / 9,
  tall,
}: {
  aspect?: number;
  tall?: boolean;
}) {
  return (
    <div
      className={`ed-cp-mock-card${tall ? " is-tall" : ""}`}
      style={{ aspectRatio: String(aspect) }}
      aria-hidden
    >
      <span className="ed-cp-mock-shimmer" />
    </div>
  );
}

function journeyCoverPreview(
  snap: ComposePreviewSnapshot,
): MilestoneMediaItem | null {
  if (!snap.journeyMediaSrc) return null;
  const thumbMeta = snap.coverThumb;
  return {
    src: snap.journeyMediaSrc,
    label: snap.title,
    isVideo: snap.journeyIsVideo || snap.isVideo,
    width: snap.thumbWidth,
    height: snap.thumbHeight,
    objectPosition: thumbMeta
      ? coverThumbObjectPosition(thumbMeta)
      : undefined,
    aspectRatio: thumbMeta ? coverThumbAspectCss(thumbMeta) : undefined,
    zoom: thumbMeta ? coverThumbZoom(thumbMeta) : undefined,
  };
}

/**
 * Xem trước Journey — cùng DOM/class với card timeline thật
 * (`j-m-card` + `JourneyMilestoneCardBodyContent`), không spine / khung mock.
 * Chỉ review bố cục («Xem đầy đủ» / «Thu gọn»); tắt lightbox, URL, media.
 */
function JourneyPreview({ snap }: { snap: ComposePreviewSnapshot }) {
  const coverPreview = journeyCoverPreview(snap);
  const ownerLabel =
    snap.ownerName || (snap.ownerSlug ? `@${snap.ownerSlug}` : "Người dùng");
  const ownerInitials = getNameInitials(
    snap.ownerName || null,
    snap.ownerSlug || "C",
  );
  const isArticle = snap.kind === "article";
  const canUnfold =
    isArticle && articleCardHasExpandableContent(snap.body, snap.blocks);
  const [contentOpen, setContentOpen] = useState(false);

  useEffect(() => {
    setContentOpen(false);
  }, [snap.title, snap.body, snap.blocks, canUnfold]);

  const isExpanded = canUnfold && contentOpen;

  function openContent() {
    if (!canUnfold || contentOpen) return;
    setContentOpen(true);
  }

  function handleExpandKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    openContent();
  }

  return (
    <div className="ed-cp-stage ed-cp-stage--journey" aria-label="Xem trước Journey">
      <article
        className={[
          "j-m-card",
          "jcard",
          `jcard--${snap.kind}`,
          "ed-cp-journey-live",
          canUnfold ? "has-unfold" : "",
          canUnfold ? (isExpanded ? "is-expanded" : "is-collapsed") : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="j-m-card-main">
          {isExpanded ? (
            <div className="jcard-unfold-sticky">
              <button
                type="button"
                className="jcard-unfold-toggle"
                onClick={() => setContentOpen(false)}
                aria-label="Thu gọn"
              >
                <ChevronUp size={15} strokeWidth={2.2} aria-hidden />
                <span>Thu gọn</span>
              </button>
            </div>
          ) : null}

          <div className="jcard-datebar">
            <span className="org-chip">
              <span className="org-logo" aria-hidden>
                {snap.ownerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={snap.ownerAvatarUrl} alt="" />
                ) : (
                  ownerInitials
                )}
              </span>
              <span className="org-copy">
                <strong>{ownerLabel}</strong>
                <small>{snap.displayDate}</small>
              </span>
            </span>
          </div>

          <JourneyMilestoneCardBodyContent
            title={snap.title}
            body={snap.body}
            noiDungBlocks={snap.blocks}
            preview={coverPreview}
            photoGridImages={snap.photoGrid}
            contentKind={snap.kind}
            captionExpandMode={
              snap.kind === "photo" || snap.kind === "video"
                ? "inline"
                : "overlay"
            }
            hasLinkedPost
            expandTrigger={
              canUnfold
                ? {
                    enabled: !isExpanded,
                    expanded: isExpanded,
                    ariaLabel: `Xem đầy đủ: ${snap.title || "bài viết"}`,
                    onClick: openContent,
                    onKeyDown: handleExpandKeyDown,
                  }
                : undefined
            }
          />

          {canUnfold ? (
            <div
              className="j-m-card-unfold"
              data-open={isExpanded ? "true" : "false"}
              aria-hidden={!isExpanded}
            >
              {isExpanded ? (
                <div className="j-m-card-unfold-inner">
                  <div className="cins-editor-page cins-post-view j-m-unfold-post">
                    <JourneyUnfoldArticleContent
                      blocksOnly
                      title={snap.title}
                      tomTat={snap.body}
                      blocks={snap.blocks}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="jcard-actions ed-cp-journey-actions" aria-hidden>
          <span className="action-btn">
            <Heart size={16} strokeWidth={1.8} />
          </span>
          <span className="action-btn">
            <ThumbsDown size={16} strokeWidth={1.8} />
          </span>
          <span className="action-btn">
            <MessageCircle size={16} strokeWidth={1.8} />
          </span>
          <span className="action-btn">
            <Bookmark size={16} strokeWidth={1.8} />
          </span>
          <span className="action-spacer" />
          <span className="action-btn">
            <Share2 size={16} strokeWidth={1.8} />
          </span>
        </div>
      </article>
    </div>
  );
}

/** Gallery/Masonry production loại bài không có visual — báo rõ trong preview. */
function snapAppearsInGallery(snap: ComposePreviewSnapshot): boolean {
  if (snap.thumbSrc) return true;
  if (snap.kind === "photo" && snap.media.length > 0) return true;
  if (snap.isVideo || snap.kind === "video") return true;
  return false;
}

function GalleryAbsentNotice({ surface }: { surface: "Gallery" | "Masonry" }) {
  return (
    <div className="ed-cp-absent" role="status">
      <p className="ed-cp-absent-title">
        Bài này chưa hiện trên {surface}
      </p>
      <p className="ed-cp-absent-body">
        Thêm thumbnail, ảnh hoặc video để xuất hiện trên lưới {surface}.
      </p>
    </div>
  );
}

function GalleryCardPreview({ snap }: { snap: ComposePreviewSnapshot }) {
  const visible = snapAppearsInGallery(snap);
  const thumbMeta = snap.coverThumb ?? DEFAULT_COVER_THUMB_META;
  const cardAspect = coverThumbAspectRatio(thumbMeta);
  const objectPosition = coverThumbObjectPosition(thumbMeta);
  const zoom = coverThumbZoom(thumbMeta);

  return (
    <div className="ed-cp-stage ed-cp-stage--gallery" aria-label="Xem trước Gallery">
      {!visible ? <GalleryAbsentNotice surface="Gallery" /> : null}
      <div
        className={`ed-cp-gallery-grid ed-cp-gallery-grid--card${visible ? "" : " is-dimmed"}`}
      >
        <div className="ed-cp-mock-wrap" aria-hidden>
          <MockNeighbor aspect={cardAspect} />
          <span className="ed-cp-mock-info" />
        </div>

        {visible ? (
          <div className="ed-cp-focus ed-cp-gallery-item is-card">
            <PreviewThumb
              src={snap.thumbSrc}
              alt={snap.galleryLabel}
              isVideo={snap.isVideo}
              aspect={cardAspect}
              objectPosition={objectPosition}
              zoom={zoom}
            />
            <div className="ed-cp-gallery-info">
              <strong>{snap.galleryLabel}</strong>
              {snap.galleryMeta ? (
                <MoTaMarkdown
                  text={snap.galleryMeta}
                  as="small"
                  className="ed-cp-gallery-meta"
                  linkify={false}
                />
              ) : (
                <small className="ed-cp-gallery-meta is-muted">
                  Không có mô tả
                </small>
              )}
              {snap.thumbAutoFromContent ? (
                <small className="ed-cp-gallery-thumb-hint" role="status">
                  Thiếu thumbnail, hệ thống tự lấy ảnh đầu tiên trong nội dung
                </small>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="ed-cp-mock-wrap is-slot-empty" aria-hidden>
            <MockNeighbor aspect={cardAspect} />
            <span className="ed-cp-mock-info" />
          </div>
        )}

        <div className="ed-cp-mock-wrap" aria-hidden>
          <MockNeighbor aspect={cardAspect} />
          <span className="ed-cp-mock-info" />
        </div>
        <div className="ed-cp-mock-wrap" aria-hidden>
          <MockNeighbor aspect={cardAspect} />
          <span className="ed-cp-mock-info" />
        </div>
        <div className="ed-cp-mock-wrap" aria-hidden>
          <MockNeighbor aspect={cardAspect} />
          <span className="ed-cp-mock-info" />
        </div>
        <div className="ed-cp-mock-wrap" aria-hidden>
          <MockNeighbor aspect={cardAspect} />
          <span className="ed-cp-mock-info" />
        </div>
      </div>
    </div>
  );
}

function MasonryPreview({ snap }: { snap: ComposePreviewSnapshot }) {
  const visible = snapAppearsInGallery(snap);
  const focusAspect =
    snap.thumbWidth && snap.thumbHeight && snap.thumbHeight > 0
      ? snap.thumbWidth / snap.thumbHeight
      : snap.isVideo
        ? 16 / 9
        : 4 / 5;

  return (
    <div className="ed-cp-stage ed-cp-stage--masonry" aria-label="Xem trước Masonry">
      {!visible ? <GalleryAbsentNotice surface="Masonry" /> : null}
      <div className={`ed-cp-masonry${visible ? "" : " is-dimmed"}`}>
        <div className="ed-cp-masonry-col ed-cp-masonry-col--side" aria-hidden>
          <MockNeighbor aspect={MOCK_NEIGHBOR_ASPECTS[0]} />
          <MockNeighbor aspect={MOCK_NEIGHBOR_ASPECTS[1]} />
          <MockNeighbor aspect={MOCK_NEIGHBOR_ASPECTS[2]} />
        </div>
        <div className="ed-cp-masonry-col ed-cp-masonry-col--main">
          <MockNeighbor aspect={MOCK_NEIGHBOR_ASPECTS[3]} />
          {visible ? (
            <div className="ed-cp-focus ed-cp-gallery-item is-masonry">
              <PreviewThumb
                src={snap.thumbSrc}
                alt={snap.galleryLabel}
                isVideo={snap.isVideo}
                aspect={snap.thumbSrc ? undefined : focusAspect}
                className={snap.thumbSrc ? "ed-cp-thumb--natural" : ""}
              />
              <GalleryMainHoverOverlay
                label={snap.galleryLabel}
                meta={snap.galleryMeta}
                authorName={
                  snap.ownerName ||
                  (snap.ownerSlug ? `@${snap.ownerSlug}` : "Người dùng")
                }
                authorAvatarUrl={snap.ownerAvatarUrl}
              />
            </div>
          ) : (
            <MockNeighbor aspect={focusAspect} />
          )}
          <MockNeighbor aspect={MOCK_NEIGHBOR_ASPECTS[4]} />
        </div>
        <div className="ed-cp-masonry-col ed-cp-masonry-col--side" aria-hidden>
          <MockNeighbor aspect={MOCK_NEIGHBOR_ASPECTS[5]} />
          <MockNeighbor aspect={1.2} />
          <MockNeighbor aspect={0.82} />
        </div>
      </div>
    </div>
  );
}

export function ComposePreviewPanel({
  draft,
  mobileOpen = false,
  onMobileClose,
}: Props) {
  const tabsId = useId();
  const [tab, setTab] = useState<ComposePreviewTab>("journey");
  const deferredDraft = useDeferredValue(draft);

  const snap = useMemo(
    () => buildComposePreviewSnapshot(deferredDraft),
    [deferredDraft],
  );

  return (
    <aside
      className={`ed-compose-preview${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Xem trước bài đăng"
    >
      <div className="ed-compose-preview-head">
        <div className="ed-compose-preview-title">
          <Eye size={15} strokeWidth={2} aria-hidden />
          <span>Xem trước</span>
        </div>
        {onMobileClose ? (
          <button
            type="button"
            className="ed-btn ghost ed-compose-preview-close"
            onClick={onMobileClose}
          >
            Đóng
          </button>
        ) : null}
      </div>

      <div
        className="ed-compose-preview-tabs"
        role="tablist"
        aria-label="Ngữ cảnh xem trước"
      >
        {TABS.map(({ id, label, Icon }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${tabsId}-${id}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel`}
              className={`ed-compose-preview-tab${selected ? " is-active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={14} strokeWidth={2} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <div
        className="ed-compose-preview-body"
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
      >
        {tab === "journey" ? <JourneyPreview snap={snap} /> : null}
        {tab === "gallery" ? <GalleryCardPreview snap={snap} /> : null}
        {tab === "masonry" ? <MasonryPreview snap={snap} /> : null}
      </div>
    </aside>
  );
}
