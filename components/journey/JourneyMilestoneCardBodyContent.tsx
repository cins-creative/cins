"use client";

import { ChevronDown, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyCardVideo } from "@/components/journey/JourneyCardVideo";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { JourneyCardEmbedPeek } from "@/components/journey/JourneyCardEmbedPeek";
import { JourneyChiChuNenPicker } from "@/components/journey/JourneyChiChuNenPicker";
import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";
import { stripMoTaMarkdown } from "@/lib/editor/mo-ta-markdown";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";
import { albumLayoutModeFromBlocks } from "@/lib/journey/album-layout-mode";
import type { GridImage } from "@/lib/journey/image-grid";
import {
  gridThumbSrc,
  isPortraitGridImage,
  mediaNaturalAspect,
} from "@/lib/journey/image-grid";
import type { MilestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { milestonePhotoLayout } from "@/lib/journey/milestone-card-kind";
import {
  articleCardNeedsDepthPreview,
  articleCardEmbedInteractivePeek,
  articleCardPeekHasEmbedMedia,
  articleCardPeekIsTextOnly,
  articleCardPeekBlocks,
  extractVideoUrl,
  plainTextCardPlain,
  milestoneCardCaptionPlain,
  milestoneCardCaptionForDisplay,
  milestoneCardCaptionNeedsCollapse,
  milestoneCardEmptyFallback,
  milestoneCardHasVisibleBody,
  shouldShowMilestoneCardTitle,
  shouldShowChiChuTitle,
  chiChuBodyPlain,
} from "@/lib/journey/post-media";
import {
  resolvePostCardLayout,
  readShowCoverInPost,
  type PostCardLayout,
} from "@/lib/journey/post-content-kind";
import {
  resolveChiChuNen,
  readChiChuNenFromBlocks,
  splitChiChuParagraphs,
  chiChuNeedsCollapse,
  chiChuNenClass,
  chiChuUsesLightInk,
  type ChiChuNenId,
} from "@/lib/journey/plain-text-bg";
import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";

type ExpandTriggerProps = {
  enabled: boolean;
  expanded?: boolean;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
};

type Props = {
  title: string;
  body?: string | null;
  noiDungBlocks?: Block[] | null;
  preview?: MilestoneMediaItem | null;
  photoGridImages?: GridImage[] | null;
  articleTags?: readonly ArticleTagRef[];
  /** Timeline card kind — `text` = bài chỉ chữ (nền màu), không unfold / không ảnh bìa. */
  contentKind?: MilestoneCardContentKind;
  /** Chủ Journey — hiện nút chọn nền màu bài chỉ chữ. */
  canEditChiChuNen?: boolean;
  tacPhamId?: string | null;
  expandTrigger?: ExpandTriggerProps;
  /** Bài chỉ chữ — trạng thái mở rộng (controlled từ `JourneyMilestoneCard` / actions). */
  chiChuExpanded?: boolean;
  onChiChuExpandedChange?: (expanded: boolean) => void;
  /** Feed cộng đồng — mở permalink thay vì unfold inline. */
  readMoreHref?: string | null;
  /** Feed tổng hợp — album/video chỉ hiện cover, không full grid/embed. */
  compactMediaPreview?: boolean;
  /** Org bài đăng / feed — caption photo/video là nội dung chính, không thu gọn. */
  disableCaptionCollapse?: boolean;
  /** `inline` — «xem thêm...» cuối dòng; `overlay` — CTA «Xem đầy đủ» (mặc định Journey). */
  captionExpandMode?: "overlay" | "inline";
  /** Có permalink bài — dùng cho fallback copy. */
  hasLinkedPost?: boolean;
  onTagLinkClick?: (e: React.MouseEvent) => void;
};

function shouldIgnoreBodyTrigger(target: Element | null): boolean {
  return Boolean(
    target?.closest(
      "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-video-native, .jcard-video-root, .jcard-actions",
    ),
  );
}

export function JourneyMilestoneCardBodyContent({
  title,
  body,
  noiDungBlocks,
  preview = null,
  photoGridImages: photoGridOverride,
  articleTags = [],
  contentKind,
  canEditChiChuNen = false,
  tacPhamId = null,
  expandTrigger,
  chiChuExpanded: chiChuExpandedProp,
  onChiChuExpandedChange,
  readMoreHref = null,
  compactMediaPreview = false,
  disableCaptionCollapse = false,
  captionExpandMode = "overlay",
  hasLinkedPost = false,
  onTagLinkClick,
}: Props) {
  const router = useRouter();
  const blocks = noiDungBlocks ?? null;
  /**
   * Cover trên card Journey / Gallery luôn tôn trọng `showCoverInPost`
   * (xem `shouldShowCoverOnPostCard` ở fetch media). Khi tắt cờ, `preview`
   * không mang cover — album ảnh vẫn hiện từ blocks.
   */
  const hasCoverPreview = Boolean(preview?.src);
  const photoGridImages = photoGridOverride ?? null;
  const albumLayoutMode = useMemo(
    () => albumLayoutModeFromBlocks(blocks),
    [blocks],
  );
  const singlePortraitMedia = Boolean(
    photoGridImages?.length === 1 &&
      isPortraitGridImage(photoGridImages[0]),
  );
  const singlePortraitAspect = singlePortraitMedia
    ? mediaNaturalAspect(
        photoGridImages![0].width,
        photoGridImages![0].height,
      )
    : null;
  const previewPortraitMedia = Boolean(
    preview &&
      (preview.height ?? 0) > 0 &&
      (preview.width ?? 0) > 0 &&
      (preview.height ?? 0) > (preview.width ?? 0),
  );
  const previewPortraitAspect =
    previewPortraitMedia && preview
      ? mediaNaturalAspect(preview.width ?? 0, preview.height ?? 0)
      : null;
  const coverIdFromPreview =
    hasCoverPreview && preview?.src
      ? extractCfImageIdFromDeliveryUrl(preview.src)
      : null;
  const cardLayout: PostCardLayout = resolvePostCardLayout({
    moTa: body,
    hasCover: hasCoverPreview,
    coverId: coverIdFromPreview,
    blocks,
  });
  const isAlbumHeroGrid = cardLayout === "album_hero_grid";
  const isTextWithImage = cardLayout === "text_with_image";
  const photoLayout = milestonePhotoLayout(blocks, hasCoverPreview, body);
  const isTextCard = contentKind === "text";
  const isPhotoCard = contentKind === "photo";
  const isVideoPost = contentKind === "video";
  const isPhotoAlbumMulti = isPhotoCard && photoLayout === "album";
  const isPhotoSingle = isPhotoCard && photoLayout === "single";
  const isArticle = contentKind === "article";
  /**
   * Seed lần mount (công thức cũ). Không đưa vào effect — tránh nhảy màu khi gõ title.
   */
  const chiChuSeed =
    title.trim() ||
    plainTextCardPlain(body, blocks) ||
    "cins-chi-chu";
  const [chiChuNen, setChiChuNen] = useState<ChiChuNenId>(() =>
    resolveChiChuNen(blocks, chiChuSeed),
  );
  const [internalChiChuExpanded, setInternalChiChuExpanded] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const chiChuExpandedControlled = onChiChuExpandedChange !== undefined;
  const chiChuExpanded = chiChuExpandedControlled
    ? (chiChuExpandedProp ?? false)
    : internalChiChuExpanded;
  const setChiChuExpanded = chiChuExpandedControlled
    ? onChiChuExpandedChange
    : setInternalChiChuExpanded;

  /* Nền đã chọn / đã lưu trong blocks. */
  useEffect(() => {
    const fromBlocks = readChiChuNenFromBlocks(blocks);
    if (fromBlocks != null) setChiChuNen(fromBlocks);
  }, [blocks]);

  /* Đổi bài trên timeline — resolve lại; compose (không tacPhamId) giữ sticky khi gõ. */
  useEffect(() => {
    if (!tacPhamId) return;
    setChiChuNen(
      resolveChiChuNen(
        blocks,
        title.trim() ||
          plainTextCardPlain(body, blocks) ||
          "cins-chi-chu",
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ theo identity bài
  }, [tacPhamId]);

  const chiChuCardText = useMemo(() => {
    if (!isTextCard) return null;
    return plainTextCardPlain(body, blocks);
  }, [isTextCard, body, blocks]);

  useEffect(() => {
    if (!isTextCard) return;
    setChiChuExpanded(false);
  }, [isTextCard, chiChuCardText, title, setChiChuExpanded]);
  const videoEmbedUrl = isVideoPost ? extractVideoUrl(blocks ?? []) : null;
  const useCompactMedia =
    compactMediaPreview && isPhotoCard && Boolean(readMoreHref);
  const videoProcessingMeta = isVideoPost
    ? extractVideoProcessingMeta(blocks ?? [])
    : null;
  const compactPhotoPreview = useMemo(() => {
    if (!useCompactMedia) return null;
    if (preview?.src) return preview;
    if (!photoGridImages?.[0]) return null;
    const first = photoGridImages[0];
    return {
      src: gridThumbSrc(first),
      width: first.width,
      height: first.height,
      label: title,
    };
  }, [photoGridImages, preview, title, useCompactMedia]);

  /** Cover hero + album — dùng chung 1 lightbox (cover = index 0). */
  const [albumLightboxIndex, setAlbumLightboxIndex] = useState<number | null>(
    null,
  );
  const albumHeroLightboxImages = useMemo((): GridImage[] | null => {
    if (!isAlbumHeroGrid || !preview?.src?.trim() || !photoGridImages?.length) {
      return null;
    }
    const coverSrc = preview.src.trim();
    const coverId =
      extractCfImageIdFromDeliveryUrl(coverSrc) ?? `cover:${coverSrc}`;
    return [
      {
        id: coverId,
        width: preview.width ?? 1200,
        height: preview.height ?? 800,
        previewSrc: coverSrc,
      },
      ...photoGridImages,
    ];
  }, [isAlbumHeroGrid, photoGridImages, preview]);
  const showCardTitle = shouldShowMilestoneCardTitle(title, blocks, body);
  const cardCaption = milestoneCardCaptionForDisplay(title, body, blocks);
  const emptyFallback =
    !milestoneCardHasVisibleBody(title, body, blocks, hasCoverPreview)
      ? milestoneCardEmptyFallback(blocks, hasLinkedPost || Boolean(readMoreHref))
      : null;
  const isContentOpen = expandTrigger?.expanded ?? false;
  const showCardTitleInBody = showCardTitle;
  const showCardCaptionInBody = Boolean(cardCaption);
  const captionNeedsCollapse =
    !disableCaptionCollapse &&
    Boolean(cardCaption) &&
    (isPhotoCard || isVideoPost || isArticle) &&
    milestoneCardCaptionNeedsCollapse(cardCaption);
  const isCaptionCollapsed = captionNeedsCollapse && !captionExpanded;
  // Article cũng dùng «Xem thêm» inline (không overlay che media).
  const captionExpandInline =
    captionExpandMode === "inline" || isArticle;

  useEffect(() => {
    setCaptionExpanded(false);
  }, [cardCaption, title]);

  function expandCaption(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.stopPropagation();
    e?.preventDefault?.();
    setCaptionExpanded(true);
  }

  const hasJcardText =
    showCardTitleInBody ||
    showCardCaptionInBody ||
    articleTags.length > 0 ||
    Boolean(emptyFallback);
  const isEmbedInteractivePeek =
    isArticle && articleCardEmbedInteractivePeek(body, blocks);
  const videoEmbedUrlForArticle = isArticle
    ? extractVideoUrl(blocks ?? [])
    : null;
  const hasBunnyInArticle = Boolean(
    videoEmbedUrlForArticle &&
      classifyBunnyVideoUrl(videoEmbedUrlForArticle),
  );
  /* Bunny + bài viết dài: hiện full peek (video + block dưới), không chỉ embed. */
  const showArticleEmbedBlocksPeek =
    isArticle &&
    !isEmbedInteractivePeek &&
    !hasBunnyInArticle &&
    articleCardPeekHasEmbedMedia(body, blocks);
  const showExpandTriggerBase =
    Boolean(expandTrigger?.enabled && isArticle && !isContentOpen) ||
    Boolean(readMoreHref && isArticle);
  const showExpandTrigger =
    showExpandTriggerBase && !isEmbedInteractivePeek;

  const articleNeedsDepth =
    isArticle &&
    (isEmbedInteractivePeek ||
      showArticleEmbedBlocksPeek ||
      hasBunnyInArticle ||
      (showExpandTriggerBase &&
        articleCardNeedsDepthPreview(body, blocks, hasCoverPreview)));
  const articlePeekBlocks = useMemo(() => {
    if (!articleNeedsDepth || !blocks?.length) return [];
    return articleCardPeekBlocks(body, blocks);
  }, [articleNeedsDepth, body, blocks]);
  const articleEmbedPeekBlocks = useMemo(
    () => articlePeekBlocks.filter((b) => b.loai === "embed"),
    [articlePeekBlocks],
  );
  /* Peek chữ thuần: không dump h2/body vào khung 480px — CTA overlay teaser
     (title/caption), block chỉ hiện khi xổ — đồng bộ bài có cover. */
  const peekIsTextOnly =
    articlePeekBlocks.length > 0 &&
    articleCardPeekIsTextOnly(body, blocks);
  const showArticleContentPeek =
    articleNeedsDepth &&
    articlePeekBlocks.length > 0 &&
    !peekIsTextOnly &&
    !showArticleEmbedBlocksPeek &&
    !isContentOpen;
  const showArticleTextDepth =
    articleNeedsDepth &&
    (articlePeekBlocks.length === 0 || peekIsTextOnly) &&
    !isContentOpen;
  /**
   * Thumbnail trên card article: hiện khi có cover (đã lọc theo
   * `shouldShowCoverOnPostCard` ở tầng media). Khi unfold bài video Bunny:
   * ẩn poster nếu chưa bật «hiện trong bài» (tránh lộ thumbnail khi peek đã tắt).
   */
  const showArticleCoverPreview =
    hasCoverPreview &&
    isArticle &&
    !(
      isContentOpen &&
      hasBunnyInArticle &&
      !readShowCoverInPost(blocks)
    );

  const expandCtaLabel = "Xem đầy đủ";

  const expandCtaOverlay = (
    <span className="jcard-expand-cta" aria-hidden>
      <ChevronDown size={14} strokeWidth={2.4} />
      {expandCtaLabel}
    </span>
  );

  const expandCtaTextDepth = (
    <span className="jcard-expand-cta jcard-expand-cta--light" aria-hidden>
      <ChevronDown size={14} strokeWidth={2.4} />
      {expandCtaLabel}
    </span>
  );

  function handleBodyClick(e: React.MouseEvent<HTMLElement>) {
    if (readMoreHref) {
      if (shouldIgnoreBodyTrigger(e.target as Element)) return;
      router.push(readMoreHref);
      return;
    }
    expandTrigger?.onClick?.(e);
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (readMoreHref) {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (shouldIgnoreBodyTrigger(e.target as Element)) return;
      e.preventDefault();
      router.push(readMoreHref);
      return;
    }
    expandTrigger?.onKeyDown?.(e);
  }

  const bodyShellProps =
    showExpandTrigger
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-expanded": isContentOpen,
          "aria-label":
            expandTrigger?.ariaLabel ??
            (readMoreHref ? `Xem đầy đủ: ${showCardTitle ? title : cardCaption || title}` : undefined),
          onClick: handleBodyClick,
          onKeyDown: handleBodyKeyDown,
        }
      : {};

  if (isContentOpen && isArticle && !hasJcardText && !preview?.src) {
    return null;
  }

  if (isTextCard) {
    const cardText = chiChuCardText;
    const showTitle = shouldShowChiChuTitle(title, blocks, body);
    const bodyPlain = chiChuBodyPlain(title, body, blocks);
    const chiChuParagraphs = bodyPlain
      ? splitChiChuParagraphs(bodyPlain)
      : [];
    const paragraphCount = chiChuParagraphs.length;
    const collapseSource = bodyPlain ?? cardText ?? "";
    const needsChiChuCollapse = collapseSource
      ? chiChuNeedsCollapse(collapseSource, paragraphCount)
      : false;
    const isChiChuCollapsed = needsChiChuCollapse && !chiChuExpanded;
    const isChiChuCompact = !needsChiChuCollapse;
    const nenClass = chiChuNenClass(chiChuNen);
    const lightInk = chiChuUsesLightInk(chiChuNen);

    return (
      <div className="jcard-body">
        <div
          className={[
            "jcard-chi-chu",
            isChiChuCompact ? " is-compact" : " is-align-left",
            nenClass,
            lightInk ? " is-light-ink" : "",
            isChiChuCollapsed ? " is-collapsed is-expand-trigger" : "",
            chiChuExpanded ? " is-content-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role={isChiChuCollapsed ? "button" : undefined}
          tabIndex={isChiChuCollapsed ? 0 : undefined}
          aria-expanded={
            needsChiChuCollapse ? chiChuExpanded : undefined
          }
          aria-label={
            isChiChuCollapsed
              ? `Xem đầy đủ: ${showTitle ? title : cardText?.slice(0, 80) ?? "bài viết"}`
              : undefined
          }
          onClick={
            isChiChuCollapsed
              ? () => setChiChuExpanded(true)
              : undefined
          }
          onKeyDown={
            isChiChuCollapsed
              ? (e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  setChiChuExpanded(true);
                }
              : undefined
          }
        >
          {showTitle ? (
            <h2 className="jcard-chi-chu-title">{title}</h2>
          ) : null}
          {chiChuParagraphs.length > 0 ? (
            <div className="jcard-chi-chu-body">
              {chiChuParagraphs.map((para, idx) => (
                <MoTaMarkdown key={idx} text={para} className="" />
              ))}
            </div>
          ) : emptyFallback ? (
            <p className="jcard-chi-chu-body jcard-desc--empty">{emptyFallback}</p>
          ) : null}
          {isChiChuCollapsed ? (
            <span className="jcard-expand-cta" aria-hidden>
              <ChevronDown size={14} strokeWidth={2.4} />
              Xem đầy đủ
            </span>
          ) : null}
        </div>

        {canEditChiChuNen && tacPhamId ? (
          <JourneyChiChuNenPicker
            tacPhamId={tacPhamId}
            nen={chiChuNen}
            onNenChange={setChiChuNen}
          />
        ) : null}

        {articleTags.length > 0 ? (
          <div className="tags jcard-tags" aria-label="Bài viết liên quan">
            {articleTags.map((t) => (
              <JourneyArticleTagLink
                key={t.id}
                tag={t}
                onClick={onTagLinkClick}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={[
        "jcard-body",
        isEmbedInteractivePeek ? " is-embed-peek-body" : "",
        showExpandTrigger ? " is-expand-trigger" : "",
        isContentOpen ? " is-content-open" : "",
      ]
        .filter(Boolean)
        .join("")}
      {...bodyShellProps}
    >
      <div
        className={[
          "jcard-content",
          showArticleTextDepth ? "is-article-depth" : "",
        ]
          .filter(Boolean)
        .join(" ")}
      >
        {hasJcardText ? (
          <div className="jcard-text">
            {showCardTitleInBody ? (
              <h2 className="jcard-title">{title}</h2>
            ) : null}

            {showCardCaptionInBody ? (
              <div
                className={[
                  "jcard-lead",
                  isCaptionCollapsed ? "is-caption-collapsed" : "",
                  isCaptionCollapsed && !captionExpandInline
                    ? "is-caption-expand-trigger"
                    : "",
                  isCaptionCollapsed && captionExpandInline
                    ? "is-caption-expand-inline"
                    : "",
                  captionExpanded ? "is-caption-expanded" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role={
                  isCaptionCollapsed && !captionExpandInline ? "button" : undefined
                }
                tabIndex={
                  isCaptionCollapsed && !captionExpandInline ? 0 : undefined
                }
                aria-expanded={captionNeedsCollapse ? captionExpanded : undefined}
                aria-label={
                  isCaptionCollapsed && !captionExpandInline
                    ? `Xem đầy đủ: ${stripMoTaMarkdown(cardCaption!).slice(0, 80)}`
                    : undefined
                }
                onClick={
                  isCaptionCollapsed && !captionExpandInline
                    ? () => expandCaption()
                    : undefined
                }
                onKeyDown={
                  isCaptionCollapsed && !captionExpandInline
                    ? (e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        expandCaption(e);
                      }
                    : undefined
                }
              >
                <MoTaMarkdown text={cardCaption} className="jcard-desc" as="div" />
                {isCaptionCollapsed && captionExpandInline ? (
                  <button
                    type="button"
                    className="jcard-caption-more"
                    onClick={expandCaption}
                    aria-label={`Xem thêm: ${stripMoTaMarkdown(cardCaption!).slice(0, 80)}`}
                  >
                    Xem thêm
                  </button>
                ) : null}
                {isCaptionCollapsed && !captionExpandInline ? (
                  <span className="jcard-expand-cta jcard-expand-cta--light" aria-hidden>
                    <ChevronDown size={14} strokeWidth={2.4} />
                    {expandCtaLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            {emptyFallback ? (
              <div className="jcard-lead">
                <p className="jcard-desc jcard-desc--empty">{emptyFallback}</p>
              </div>
            ) : null}

            {articleTags.length > 0 ? (
              <div className="tags jcard-tags" aria-label="Bài viết liên quan">
                {articleTags.map((t) => (
                  <JourneyArticleTagLink
                    key={t.id}
                    tag={t}
                    onClick={onTagLinkClick}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="jcard-media-zone">
          {useCompactMedia ? (
            readMoreHref ? (
              <Link href={readMoreHref} className="preview" prefetch={false}>
                {compactPhotoPreview?.src ? (
                  <JourneyCoverImage
                    src={compactPhotoPreview.src}
                    srcSet={compactPhotoPreview.srcSet}
                    sizes={
                      compactPhotoPreview.srcSet
                        ? "(max-width: 767px) 100vw, 680px"
                        : undefined
                    }
                    width={compactPhotoPreview.width}
                    height={compactPhotoPreview.height}
                    alt={compactPhotoPreview.label || title}
                    objectPosition={compactPhotoPreview.objectPosition}
                    zoom={compactPhotoPreview.zoom}
                  />
                ) : null}
                <span className="jcard-expand-cta" aria-hidden>
                  <ChevronDown size={14} strokeWidth={2.4} />
                  {expandCtaLabel}
                </span>
              </Link>
            ) : null
          ) : isVideoPost && videoEmbedUrl ? (
            <JourneyCardVideo
              url={videoEmbedUrl}
              title={showCardTitle ? title : cardCaption || title}
              processing={videoProcessingMeta?.processing === true}
              preview={
                hasCoverPreview && preview
                  ? {
                      src: preview.src,
                      width: preview.width,
                      height: preview.height,
                      label: preview.label || title,
                      objectPosition: preview.objectPosition,
                      zoom: preview.zoom,
                    }
                  : null
              }
              noiDungBlocks={blocks ?? undefined}
            />
          ) : isAlbumHeroGrid && hasCoverPreview && preview && photoGridImages?.length ? (
            <div className="jcard-photo-album">
              <button
                type="button"
                className="preview preview--album-hero"
                aria-label="Xem ảnh bìa lớn"
                style={
                  preview.aspectRatio
                    ? { aspectRatio: preview.aspectRatio }
                    : undefined
                }
                onClick={() => setAlbumLightboxIndex(0)}
              >
                <JourneyCoverImage
                  src={preview.src}
                  srcSet={preview.srcSet}
                  sizes={
                    preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                  }
                  width={preview.width}
                  height={preview.height}
                  alt={preview.label || title}
                  objectPosition={preview.objectPosition}
                  zoom={preview.zoom}
                />
              </button>
              <div className="preview preview--photo-grid">
                <ImageGrid
                  images={photoGridImages}
                  readOnly
                  timelineLightbox
                  albumLayoutMode={albumLayoutMode}
                  lightboxIndex={albumLightboxIndex}
                  onLightboxIndexChange={setAlbumLightboxIndex}
                  lightboxImages={albumHeroLightboxImages ?? undefined}
                  lightboxIndexOffset={1}
                />
              </div>
            </div>
          ) : isPhotoAlbumMulti && photoGridImages && photoGridImages.length > 0 ? (
            <div className="preview preview--photo-grid">
              <ImageGrid
                images={photoGridImages}
                readOnly
                timelineLightbox
                albumLayoutMode={albumLayoutMode}
              />
            </div>
          ) : (isPhotoSingle || isPhotoCard) &&
            photoGridImages &&
            photoGridImages.length > 0 ? (
            <div
              className={`preview preview--photo-grid${singlePortraitMedia ? " is-portrait-media" : ""}`}
              style={
                singlePortraitAspect != null
                  ? ({
                      ["--media-natural-aspect" as string]: String(
                        singlePortraitAspect,
                      ),
                    } as CSSProperties)
                  : undefined
              }
            >
              <ImageGrid
                images={photoGridImages}
                readOnly
                timelineLightbox
                albumLayoutMode={albumLayoutMode}
              />
            </div>
          ) : isTextWithImage && hasCoverPreview && preview ? (
            <div
              className={`preview preview--photo-grid preview--photo-single${previewPortraitMedia ? " is-portrait-media" : ""}`}
              style={
                preview.aspectRatio
                  ? { aspectRatio: preview.aspectRatio }
                  : previewPortraitAspect != null
                    ? ({
                        ["--media-natural-aspect" as string]: String(
                          previewPortraitAspect,
                        ),
                      } as CSSProperties)
                    : undefined
              }
            >
              <JourneyCoverImage
                src={preview.src}
                srcSet={preview.srcSet}
                sizes={
                  preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview.width}
                height={preview.height}
                alt={preview.label || title}
                objectPosition={preview.objectPosition}
                zoom={preview.zoom}
              />
            </div>
          ) : isPhotoCard && hasCoverPreview && preview ? (
            <div
              className={`preview preview--photo-grid preview--photo-single${previewPortraitMedia ? " is-portrait-media" : ""}`}
              style={
                preview.aspectRatio
                  ? { aspectRatio: preview.aspectRatio }
                  : previewPortraitAspect != null
                    ? ({
                        ["--media-natural-aspect" as string]: String(
                          previewPortraitAspect,
                        ),
                      } as CSSProperties)
                    : undefined
              }
            >
              <JourneyCoverImage
                src={preview.src}
                srcSet={preview.srcSet}
                sizes={
                  preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview.width}
                height={preview.height}
                alt={preview.label || title}
                objectPosition={preview.objectPosition}
                zoom={preview.zoom}
              />
            </div>
          ) : isEmbedInteractivePeek && blocks?.length ? (
            <JourneyCardEmbedPeek body={body} blocks={blocks} />
          ) : showArticleEmbedBlocksPeek && articleEmbedPeekBlocks.length > 0 ? (
            <div className="preview preview--article-peek is-embed-interactive">
              <PostBlockRenderer blocks={articleEmbedPeekBlocks} />
            </div>
          ) : showArticleContentPeek ? (
            <div className="preview preview--article-peek">
              <div className="preview--article-peek-inner">
                <PostBlockRenderer blocks={articlePeekBlocks} />
              </div>
              {showExpandTrigger ? expandCtaOverlay : null}
            </div>
          ) : readMoreHref && isArticle && showArticleCoverPreview ? (
            <Link
              href={readMoreHref}
              className="preview"
              prefetch={false}
              style={
                preview?.aspectRatio
                  ? { aspectRatio: preview.aspectRatio }
                  : undefined
              }
            >
              {preview ? (
                <JourneyCoverImage
                  src={preview.src}
                  srcSet={preview.srcSet}
                  sizes={
                    preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                  }
                  width={preview.width}
                  height={preview.height}
                  alt={preview.label || title}
                  objectPosition={preview.objectPosition}
                  zoom={preview.zoom}
                />
              ) : (
                <div className="preview-inner">
                  <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
                  <span className="preview-label">Ảnh bìa bài viết</span>
                </div>
              )}
              {showExpandTrigger ? expandCtaOverlay : null}
            </Link>
          ) : showArticleCoverPreview ? (
            <div
              className="preview"
              style={
                preview?.aspectRatio
                  ? { aspectRatio: preview.aspectRatio }
                  : undefined
              }
            >
              <JourneyCoverImage
                src={preview!.src}
                srcSet={preview!.srcSet}
                sizes={
                  preview!.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview!.width}
                height={preview!.height}
                alt={preview!.label || title}
                objectPosition={preview!.objectPosition}
                zoom={preview!.zoom}
              />
              {showExpandTrigger ? expandCtaOverlay : null}
            </div>
          ) : null}
        </div>
        {showArticleTextDepth && showExpandTrigger ? expandCtaTextDepth : null}
      </div>
    </div>
  );
}
