"use client";

import { ChevronDown, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block } from "@/lib/editor/types";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyCardVideo } from "@/components/journey/JourneyCardVideo";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { JourneyChiChuNenPicker } from "@/components/journey/JourneyChiChuNenPicker";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import type { GridImage } from "@/lib/journey/image-grid";
import { gridThumbSrc } from "@/lib/journey/image-grid";
import type { MilestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { milestonePhotoLayout } from "@/lib/journey/milestone-card-kind";
import {
  articleCardNeedsDepthPreview,
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
  type PostCardLayout,
} from "@/lib/journey/post-content-kind";
import {
  resolveChiChuNen,
  splitChiChuParagraphs,
  chiChuNeedsCollapse,
  chiChuNenClass,
  chiChuUsesCenterAlign,
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
  const hasCoverPreview = Boolean(preview?.src);
  const photoGridImages = photoGridOverride ?? null;
  const cardLayout: PostCardLayout = resolvePostCardLayout({
    moTa: body,
    hasCover: hasCoverPreview,
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

  useEffect(() => {
    setChiChuNen(resolveChiChuNen(blocks, chiChuSeed));
  }, [blocks, chiChuSeed]);

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
    if (!useCompactMedia || !photoGridImages?.[0]) return preview;
    if (preview?.src) return preview;
    const first = photoGridImages[0];
    return {
      src: gridThumbSrc(first),
      width: first.width,
      height: first.height,
      label: title,
    };
  }, [photoGridImages, preview, title, useCompactMedia]);
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
    (isPhotoCard || isVideoPost) &&
    milestoneCardCaptionNeedsCollapse(cardCaption);
  const isCaptionCollapsed = captionNeedsCollapse && !captionExpanded;
  const captionExpandInline = captionExpandMode === "inline";

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
  const showExpandTrigger =
    Boolean(expandTrigger?.enabled && isArticle && !isContentOpen) ||
    Boolean(readMoreHref && isArticle);

  const articleNeedsDepth =
    showExpandTrigger &&
    isArticle &&
    !preview?.src &&
    articleCardNeedsDepthPreview(body, blocks, hasCoverPreview);
  const articlePeekBlocks = useMemo(() => {
    if (!articleNeedsDepth || !blocks?.length) return [];
    return articleCardPeekBlocks(body, blocks);
  }, [articleNeedsDepth, body, blocks]);
  const showArticleContentPeek =
    articleNeedsDepth && articlePeekBlocks.length > 0;
  const showArticleTextDepth =
    articleNeedsDepth && articlePeekBlocks.length === 0;

  const expandCtaLabel = "Xem đầy đủ";

  const expandCtaOverlay = (
    <span className="jcard-expand-cta" aria-hidden>
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
    const showTitle = shouldShowChiChuTitle(title, blocks);
    const bodyPlain = chiChuBodyPlain(title, body, blocks);
    const nenClass = chiChuNenClass(chiChuNen);
    const lightInk = chiChuUsesLightInk(chiChuNen);
    const paragraphs = bodyPlain ? splitChiChuParagraphs(bodyPlain) : [];
    const collapseSource = bodyPlain ?? cardText ?? "";
    const centerAlign = chiChuUsesCenterAlign(paragraphs.length);
    const needsChiChuCollapse = collapseSource
      ? chiChuNeedsCollapse(collapseSource, paragraphs.length)
      : false;
    const isChiChuCollapsed = needsChiChuCollapse && !chiChuExpanded;

    return (
      <div className="jcard-body">
        <div
          className={[
            "jcard-chi-chu",
            nenClass,
            lightInk ? " is-light-ink" : "",
            centerAlign ? " is-align-center" : " is-align-left",
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
          {paragraphs.length > 0 ? (
            <div className="jcard-chi-chu-body">
              {paragraphs.map((para, idx) => (
                <p key={`${idx}-${para.slice(0, 48)}`}>{para}</p>
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
          .join("")}
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
                    ? `Xem đầy đủ: ${cardCaption!.slice(0, 80)}`
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
                <p className="jcard-desc">{cardCaption}</p>
                {isCaptionCollapsed && captionExpandInline ? (
                  <button
                    type="button"
                    className="jcard-caption-more"
                    onClick={expandCaption}
                    aria-label={`Xem thêm: ${cardCaption!.slice(0, 80)}`}
                  >
                    xem thêm...
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
                preview
                  ? {
                      src: preview.src,
                      width: preview.width,
                      height: preview.height,
                      label: preview.label || title,
                    }
                  : null
              }
              noiDungBlocks={blocks ?? undefined}
            />
          ) : isAlbumHeroGrid && preview?.src && photoGridImages ? (
            <div className="jcard-photo-album">
              <div className="preview preview--album-hero">
                <JourneyCoverImage
                  src={preview.src}
                  srcSet={preview.srcSet}
                  sizes={
                    preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                  }
                  width={preview.width}
                  height={preview.height}
                  alt={preview.label || title}
                />
              </div>
              <div className="preview preview--photo-grid">
                <ImageGrid images={photoGridImages} readOnly timelineLightbox />
              </div>
            </div>
          ) : isPhotoAlbumMulti && photoGridImages ? (
            <div className="preview preview--photo-grid">
              <ImageGrid images={photoGridImages} readOnly timelineLightbox />
            </div>
          ) : (isPhotoSingle || isPhotoCard) && photoGridImages ? (
            <div className="preview preview--photo-grid">
              <ImageGrid images={photoGridImages} readOnly timelineLightbox />
            </div>
          ) : isTextWithImage && preview?.src ? (
            <div className="preview preview--photo-grid preview--photo-single">
              <JourneyCoverImage
                src={preview.src}
                srcSet={preview.srcSet}
                sizes={
                  preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview.width}
                height={preview.height}
                alt={preview.label || title}
              />
            </div>
          ) : isPhotoCard && preview?.src ? (
            <div className="preview preview--photo-grid preview--photo-single">
              <JourneyCoverImage
                src={preview.src}
                srcSet={preview.srcSet}
                sizes={
                  preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview.width}
                height={preview.height}
                alt={preview.label || title}
              />
            </div>
          ) : showArticleContentPeek ? (
            <div className="preview preview--article-peek">
              <div className="preview--article-peek-inner">
                <PostBlockRenderer blocks={articlePeekBlocks} />
              </div>
              {showExpandTrigger ? expandCtaOverlay : null}
            </div>
          ) : readMoreHref && isArticle ? (
            <Link href={readMoreHref} className="preview" prefetch={false}>
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
                />
              ) : (
                <div className="preview-inner">
                  <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
                  <span className="preview-label">Ảnh bìa bài viết</span>
                </div>
              )}
              {showExpandTrigger ? expandCtaOverlay : null}
            </Link>
          ) : preview?.src && isArticle ? (
            <div className="preview">
              <JourneyCoverImage
                src={preview.src}
                srcSet={preview.srcSet}
                sizes={
                  preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                }
                width={preview.width}
                height={preview.height}
                alt={preview.label || title}
              />
              {showExpandTrigger ? expandCtaOverlay : null}
            </div>
          ) : null}
        </div>
        {showArticleTextDepth && showExpandTrigger ? expandCtaOverlay : null}
      </div>
    </div>
  );
}
