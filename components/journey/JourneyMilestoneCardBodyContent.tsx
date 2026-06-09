"use client";

import { ChevronDown, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block } from "@/lib/editor/types";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyCardVideo } from "@/components/journey/JourneyCardVideo";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import { photoGridImagesFromBlocks } from "@/lib/journey/image-grid";
import {
  detectMediaPostKind,
  extractVideoUrl,
  milestoneCardCaptionPlain,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
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
  photoGridImages?: ReturnType<typeof photoGridImagesFromBlocks>;
  articleTags?: readonly ArticleTagRef[];
  expandTrigger?: ExpandTriggerProps;
  /** Feed cộng đồng — mở permalink thay vì unfold inline. */
  readMoreHref?: string | null;
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
  expandTrigger,
  readMoreHref = null,
  onTagLinkClick,
}: Props) {
  const router = useRouter();
  const blocks = noiDungBlocks ?? null;
  const photoGridImages =
    photoGridOverride ?? photoGridImagesFromBlocks(blocks);
  const mediaKind = detectMediaPostKind(blocks);
  const isPhotoAlbum = mediaKind === "photo" && photoGridImages !== null;
  const isVideoPost = mediaKind === "video";
  const isArticle = !isPhotoAlbum && !isVideoPost;
  const videoEmbedUrl = isVideoPost ? extractVideoUrl(blocks ?? []) : null;
  const videoProcessingMeta = isVideoPost
    ? extractVideoProcessingMeta(blocks ?? [])
    : null;
  const showCardTitle = shouldShowMilestoneCardTitle(title, blocks);
  const cardCaption = milestoneCardCaptionPlain(body, blocks);
  const isContentOpen = expandTrigger?.expanded ?? false;
  const showExpandTrigger =
    Boolean(
      expandTrigger?.enabled &&
        (isArticle || isPhotoAlbum || isVideoPost) &&
        !isContentOpen,
    ) ||
    Boolean(readMoreHref && isArticle);

  const expandCtaLabel = isPhotoAlbum || isVideoPost ? "Xem thêm" : "Đọc bài viết";

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
            (readMoreHref ? `Mở bài viết: ${showCardTitle ? title : cardCaption || title}` : undefined),
          onClick: handleBodyClick,
          onKeyDown: handleBodyKeyDown,
        }
      : {};

  return (
    <div
      className={`jcard-body${showExpandTrigger ? " is-expand-trigger" : ""}`}
      {...bodyShellProps}
    >
      <div className="jcard-content">
        {showCardTitle || cardCaption || articleTags.length > 0 ? (
          <div className="jcard-text">
            {showCardTitle ? <h2 className="jcard-title">{title}</h2> : null}

            {cardCaption && !isArticle ? (
              <div className="jcard-lead">
                <p className="jcard-desc">{cardCaption}</p>
              </div>
            ) : null}

            {cardCaption && isArticle ? (
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

        <div
          className="jcard-media-zone"
          data-collapsed={isArticle && isContentOpen ? "true" : "false"}
          aria-hidden={isArticle && isContentOpen}
        >
          {isVideoPost && videoEmbedUrl ? (
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
          ) : isPhotoAlbum && photoGridImages ? (
            <div className="preview preview--photo-grid">
              <ImageGrid
                images={photoGridImages}
                readOnly
                timelineLightbox
              />
              {showExpandTrigger ? (
                <span className="jcard-expand-cta" aria-hidden>
                  <ChevronDown size={14} strokeWidth={2.4} />
                  {expandCtaLabel}
                </span>
              ) : null}
            </div>
          ) : readMoreHref ? (
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
          ) : (
            <div className="preview">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
