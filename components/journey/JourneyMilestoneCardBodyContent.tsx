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
import { JourneyTextPanelTonePicker } from "@/components/journey/JourneyTextPanelTonePicker";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import type { GridImage } from "@/lib/journey/image-grid";
import { gridThumbSrc } from "@/lib/journey/image-grid";
import type { MilestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { milestonePhotoLayout } from "@/lib/journey/milestone-card-kind";
import {
  extractVideoUrl,
  milestoneArticleTextPanelPlain,
  milestoneCardCaptionPlain,
  shouldShowMilestoneCardTitle,
  shouldShowTextPanelTitle,
  textPanelBodyPlain,
} from "@/lib/journey/post-media";
import {
  resolveTextPanelTone,
  splitTextPanelParagraphs,
  textPanelNeedsCollapse,
  textPanelToneClass,
  textPanelUsesCenterAlign,
  textPanelUsesLightInk,
  type TextPanelToneId,
} from "@/lib/journey/text-panel-tone";
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
  /** Timeline card kind — `text` = panel chữ, không unfold / không ảnh bìa. */
  contentKind?: MilestoneCardContentKind;
  /** Chủ Journey — hiện nút chọn màu nền card chữ. */
  canEditTextPanelTone?: boolean;
  tacPhamId?: string | null;
  expandTrigger?: ExpandTriggerProps;
  /** Card chữ — trạng thái mở rộng (controlled từ `JourneyMilestoneCard` / actions). */
  textPanelExpanded?: boolean;
  onTextPanelExpandedChange?: (expanded: boolean) => void;
  /** Feed cộng đồng — mở permalink thay vì unfold inline. */
  readMoreHref?: string | null;
  /** Feed tổng hợp — album/video chỉ hiện cover, không full grid/embed. */
  compactMediaPreview?: boolean;
  onTagLinkClick?: (e: React.MouseEvent) => void;
};

function shouldIgnoreBodyTrigger(target: Element | null): boolean {
  return Boolean(
    target?.closest(
      "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions",
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
  canEditTextPanelTone = false,
  tacPhamId = null,
  expandTrigger,
  textPanelExpanded: textPanelExpandedProp,
  onTextPanelExpandedChange,
  readMoreHref = null,
  compactMediaPreview = false,
  onTagLinkClick,
}: Props) {
  const router = useRouter();
  const blocks = noiDungBlocks ?? null;
  const hasCoverPreview = Boolean(preview?.src);
  const photoGridImages = photoGridOverride ?? null;
  const photoLayout = milestonePhotoLayout(blocks, hasCoverPreview, body);
  const isTextCard = contentKind === "text";
  const isPhotoCard = contentKind === "photo";
  const isVideoPost = contentKind === "video";
  const isPhotoAlbumMulti = isPhotoCard && photoLayout === "album";
  const isPhotoSingle = isPhotoCard && photoLayout === "single";
  const isArticle = contentKind === "article";
  const textPanelSeed =
    title.trim() ||
    milestoneArticleTextPanelPlain(body, blocks) ||
    "cins-text";
  const [panelTone, setPanelTone] = useState<TextPanelToneId>(() =>
    resolveTextPanelTone(blocks, textPanelSeed),
  );
  const [internalTextPanelExpanded, setInternalTextPanelExpanded] = useState(false);
  const textPanelExpandedControlled = onTextPanelExpandedChange !== undefined;
  const textPanelExpanded = textPanelExpandedControlled
    ? (textPanelExpandedProp ?? false)
    : internalTextPanelExpanded;
  const setTextPanelExpanded = textPanelExpandedControlled
    ? onTextPanelExpandedChange
    : setInternalTextPanelExpanded;

  useEffect(() => {
    setPanelTone(resolveTextPanelTone(blocks, textPanelSeed));
  }, [blocks, textPanelSeed]);

  const textCardPanelText = useMemo(() => {
    if (!isTextCard) return null;
    return milestoneArticleTextPanelPlain(body, blocks);
  }, [isTextCard, body, blocks]);

  useEffect(() => {
    if (!isTextCard) return;
    setTextPanelExpanded(false);
  }, [isTextCard, textCardPanelText, title, setTextPanelExpanded]);
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
  const cardCaption = milestoneCardCaptionPlain(body, blocks);
  const isContentOpen = expandTrigger?.expanded ?? false;
  const showCardTitleInBody = showCardTitle;
  const showCardCaptionInBody = Boolean(cardCaption);
  const hasJcardText =
    showCardTitleInBody || showCardCaptionInBody || articleTags.length > 0;
  const showExpandTrigger =
    Boolean(expandTrigger?.enabled && isArticle && !isContentOpen) ||
    Boolean(readMoreHref && isArticle);

  const expandCtaLabel = "Xem đầy đủ";

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
    const panelText = textCardPanelText;
    const showTitle = shouldShowTextPanelTitle(title, blocks);
    const bodyPlain = textPanelBodyPlain(title, body, blocks);
    const toneClass = textPanelToneClass(panelTone);
    const lightInk = textPanelUsesLightInk(panelTone);
    const paragraphs = bodyPlain ? splitTextPanelParagraphs(bodyPlain) : [];
    const collapseSource = bodyPlain ?? panelText ?? "";
    const centerAlign = textPanelUsesCenterAlign(paragraphs.length);
    const needsTextPanelCollapse = collapseSource
      ? textPanelNeedsCollapse(collapseSource, paragraphs.length)
      : false;
    const isTextPanelCollapsed = needsTextPanelCollapse && !textPanelExpanded;

    return (
      <div className="jcard-body">
        <div
          className={[
            "jcard-text-panel",
            toneClass,
            lightInk ? " is-light-ink" : "",
            centerAlign ? " is-align-center" : " is-align-left",
            isTextPanelCollapsed ? " is-collapsed is-expand-trigger" : "",
            textPanelExpanded ? " is-content-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role={isTextPanelCollapsed ? "button" : undefined}
          tabIndex={isTextPanelCollapsed ? 0 : undefined}
          aria-expanded={
            needsTextPanelCollapse ? textPanelExpanded : undefined
          }
          aria-label={
            isTextPanelCollapsed
              ? `Xem đầy đủ: ${showTitle ? title : panelText?.slice(0, 80) ?? "bài viết"}`
              : undefined
          }
          onClick={
            isTextPanelCollapsed
              ? () => setTextPanelExpanded(true)
              : undefined
          }
          onKeyDown={
            isTextPanelCollapsed
              ? (e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  setTextPanelExpanded(true);
                }
              : undefined
          }
        >
          {showTitle ? (
            <h2 className="jcard-text-panel-title">{title}</h2>
          ) : null}
          {paragraphs.length > 0 ? (
            <div className="jcard-text-panel-body">
              {paragraphs.map((para, idx) => (
                <p key={`${idx}-${para.slice(0, 48)}`}>{para}</p>
              ))}
            </div>
          ) : null}
          {isTextPanelCollapsed ? (
            <span className="jcard-expand-cta" aria-hidden>
              <ChevronDown size={14} strokeWidth={2.4} />
              Xem đầy đủ
            </span>
          ) : null}
        </div>

        {canEditTextPanelTone && tacPhamId ? (
          <JourneyTextPanelTonePicker
            tacPhamId={tacPhamId}
            tone={panelTone}
            onToneChange={setPanelTone}
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
      <div className="jcard-content">
        {hasJcardText ? (
          <div className="jcard-text">
            {showCardTitleInBody ? (
              <h2 className="jcard-title">{title}</h2>
            ) : null}

            {showCardCaptionInBody ? (
              <div className="jcard-lead">
                <p className="jcard-desc">{cardCaption}</p>
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
          ) : isPhotoAlbumMulti && photoGridImages ? (
            <div className="preview preview--photo-grid">
              <ImageGrid images={photoGridImages} readOnly timelineLightbox />
            </div>
          ) : (isPhotoSingle || isPhotoCard) && photoGridImages ? (
            <div className="preview preview--photo-grid">
              <ImageGrid images={photoGridImages} readOnly timelineLightbox />
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
              {showExpandTrigger ? (
                <span className="jcard-expand-cta" aria-hidden>
                  <ChevronDown size={14} strokeWidth={2.4} />
                  {expandCtaLabel}
                </span>
              ) : null}
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
              {showExpandTrigger ? (
                <span className="jcard-expand-cta" aria-hidden>
                  <ChevronDown size={14} strokeWidth={2.4} />
                  {expandCtaLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
