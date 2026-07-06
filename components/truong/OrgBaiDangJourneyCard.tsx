"use client";

import Link from "next/link";
import { ChevronUp } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";

import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import {
  milestoneCardContentKind,
  milestoneCardPhotoGrid,
} from "@/lib/journey/milestone-card-kind";
import { milestoneCardCaptionPlain, milestoneArticleTextPanelPlain } from "@/lib/journey/post-media";
import {
  splitTextPanelParagraphs,
  textPanelNeedsCollapse,
} from "@/lib/journey/text-panel-tone";
import { OrgBaiDangBookmarkButton } from "@/components/truong/OrgBaiDangBookmarkButton";
import { OrgBaiDangLikeButton } from "@/components/truong/OrgBaiDangLikeButton";
import { OrgBaiDangLoaiBadge } from "@/components/truong/OrgBaiDangLoaiBadge";
import { OrgBaiDangPublishedDate } from "@/components/truong/OrgBaiDangPublishedDate";
import { OrgBaiDangScheduledBadge } from "@/components/truong/OrgBaiDangScheduledBadge";
import { baiDangUsesBlocks } from "@/lib/truong/bai-dang-blocks";
import { TruongBaiDangPostActions } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { trackSuKien, useImpressionTracker } from "@/lib/social/track-su-kien";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { baiDangCoverDisplayUrl, baiDangJourneyPreviewUrl } from "@/lib/truong/bai-dang-cover";
import {
  baiDangHasExpandableBody,
  buildBaiDangThumbPreview,
  buildLegacyPhotoGridImages,
  stripHtmlToPlainText,
} from "@/lib/truong/bai-dang-content";
import {
  baiDangCardKind,
  baiDangYear,
} from "@/lib/truong/bai-dang-timeline";
import { isTruongBaiDangScheduled } from "@/lib/truong/org-bai-dang-schedule";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten"
>;

type Props = {
  post: TruongBaiDang;
  /** Fallback khi không có `TruongInlineEditProvider` (vd. trang cơ sở khách). */
  owner?: OrgOwner | null;
};

function shouldIgnoreExpandTrigger(target: Element | null): boolean {
  return Boolean(
    target?.closest(
      "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions, .tdh-baidang-edit, .org-baidang-date-edit, .org-baidang-loai-picker",
    ),
  );
}

function orgBaiDangPreviewMedia(post: TruongBaiDang): MilestoneMediaItem | null {
  const url = baiDangJourneyPreviewUrl(post);
  if (!url) return null;

  let width = 800;
  let height = 450;
  for (const block of post.noiDungBlocks ?? []) {
    if (block.loai !== "imgs") continue;
    const cfg = block.config ?? {};
    if (typeof cfg.width === "number" && cfg.width > 0) width = Math.round(cfg.width);
    if (typeof cfg.height === "number" && cfg.height > 0) height = Math.round(cfg.height);
    break;
  }

  return {
    src: url,
    width,
    height,
    label: post.tieu_de,
  };
}

export function OrgBaiDangJourneyCard({ post, owner = null }: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? owner;
  const isScheduled = isTruongBaiDangScheduled(post);
  const showScheduledUi = ctx?.isEditing && isScheduled;
  const [expanded, setExpanded] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  /* Analytics tiếp cận — card này luôn trên TRANG TỔ CHỨC (org/co-so/studio)
   * → nguồn `org_page` (trong tổ chức). Người CÓ quyền sửa org là "người trong
   * nhà" → KHÔNG tự đếm lượt tiếp cận của họ (phản-vanity). */
  const isOrgStaff = Boolean(ctx?.canEdit);
  useImpressionTracker(
    articleRef,
    { loaiDoiTuong: "org_bai_dang", idDoiTuong: post.id, nguon: "org_page" },
    !isOrgStaff,
  );

  function trackOpenContent() {
    if (isOrgStaff) return;
    trackSuKien({
      loai_su_kien: "mo_card",
      loai_doi_tuong: "org_bai_dang",
      id_doi_tuong: post.id,
      nguon: "org_page",
    });
  }

  const usesBlocks = baiDangUsesBlocks(post);
  const blocks = post.noiDungBlocks ?? null;
  const coverUrl = baiDangCoverDisplayUrl(post);
  const canExpand = baiDangHasExpandableBody(post);
  const hasRichBody = Boolean(post.noi_dung?.trim());

  const previewMedia = useMemo(() => {
    if (usesBlocks) return orgBaiDangPreviewMedia(post);
    if (coverUrl) {
      return {
        src: coverUrl,
        width: 800,
        height: 450,
        label: post.tieu_de,
      } satisfies MilestoneMediaItem;
    }
    return null;
  }, [post, usesBlocks, coverUrl]);

  const blocksCardKind = usesBlocks
    ? milestoneCardContentKind(blocks, Boolean(previewMedia?.src), post.tom_tat)
    : null;
  const cardKind = blocksCardKind ?? baiDangCardKind(post);
  const isArticleCard = cardKind === "article";
  const isTextCard = cardKind === "text";
  const isMediaCard = cardKind === "photo" || cardKind === "video";
  const textCardPanelText = useMemo(() => {
    if (!isTextCard || !usesBlocks) return null;
    return milestoneArticleTextPanelPlain(post.tom_tat, blocks);
  }, [isTextCard, usesBlocks, post.tom_tat, blocks]);
  const textPanelParagraphs = useMemo(
    () => (textCardPanelText ? splitTextPanelParagraphs(textCardPanelText) : []),
    [textCardPanelText],
  );
  const textPanelCollapsible = Boolean(
    textCardPanelText &&
      textPanelNeedsCollapse(textCardPanelText, textPanelParagraphs.length),
  );
  const [textPanelExpanded, setTextPanelExpanded] = useState(false);
  const showTextPanelUnfold =
    isTextCard && textPanelCollapsible && textPanelExpanded;
  const useUnifiedMediaBody = usesBlocks || isMediaCard;

  const legacyPhotoGrid = useMemo(
    () =>
      !usesBlocks && cardKind === "photo" ? buildLegacyPhotoGridImages(post) : null,
    [usesBlocks, cardKind, post],
  );

  const photoGridImages = useMemo(() => {
    if (usesBlocks)
      return milestoneCardPhotoGrid(
        blocks,
        Boolean(previewMedia?.src),
        post.tom_tat,
      );
    return legacyPhotoGrid;
  }, [usesBlocks, blocks, legacyPhotoGrid]);

  const supportsInlineUnfold = useUnifiedMediaBody && isArticleCard;

  const legacyCardExpand = !useUnifiedMediaBody && canExpand && !usesBlocks;
  const year = baiDangYear(post.tao_luc);
  const month = post.tao_luc ? new Date(post.tao_luc).getMonth() + 1 : null;
  const showUnfold = supportsInlineUnfold && expanded;
  const cardCaption = milestoneCardCaptionPlain(post.tom_tat, blocks);

  useEffect(() => {
    setTextPanelExpanded(false);
  }, [textCardPanelText, post.tieu_de]);

  const thumbPreview = useMemo(
    () => buildBaiDangThumbPreview(post.noi_dung),
    [post.noi_dung],
  );

  const previewText = useMemo(() => {
    if (cardCaption) return cardCaption;
    if (post.tom_tat?.trim()) return post.tom_tat.trim();
    if (post.noi_dung?.trim()) {
      const plain = stripHtmlToPlainText(post.noi_dung);
      if (plain) return plain;
    }
    return null;
  }, [cardCaption, post.tom_tat, post.noi_dung]);

  function onCardClick(e: React.MouseEvent) {
    if (!legacyCardExpand) return;
    const t = e.target as HTMLElement;
    if (t.closest("a, button")) return;
    setExpanded((v) => {
      if (!v) trackOpenContent();
      return !v;
    });
  }

  function onBlocksExpandTrigger(e: React.MouseEvent<HTMLElement>) {
    if (
      !supportsInlineUnfold ||
      expanded ||
      shouldIgnoreExpandTrigger(e.target as Element)
    ) {
      return;
    }
    trackOpenContent();
    setExpanded(true);
  }

  function onBlocksExpandKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (!supportsInlineUnfold || expanded) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (shouldIgnoreExpandTrigger(e.target as Element)) return;
    e.preventDefault();
    trackOpenContent();
    setExpanded(true);
  }

  const blocksCardClassName = [
    "j-m-card",
    "jcard",
    `jcard--${cardKind}`,
    isArticleCard ? "has-unfold" : "",
    showUnfold ? "is-expanded" : isArticleCard ? "is-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={articleRef}
      id={`org-post-${post.id}`}
      className={`j-milestone j-self org-baidang-milestone${expanded || showTextPanelUnfold ? " is-card-expanded" : ""}${showScheduledUi ? " is-scheduled" : ""}`}
      data-year={year ?? undefined}
      data-month={month ?? undefined}
      data-content-kind={cardKind}
      data-scheduled={showScheduledUi ? "true" : undefined}
    >
      <div className="j-m-body-wrap">
        <div
          className={
            useUnifiedMediaBody
              ? blocksCardClassName
              : `j-m-card jcard jcard--${cardKind}${legacyCardExpand ? " is-expandable" : ""}${expanded ? " is-expanded" : legacyCardExpand ? " is-collapsed" : ""}`
          }
          onClick={useUnifiedMediaBody ? undefined : onCardClick}
          role={legacyCardExpand ? "button" : undefined}
          tabIndex={legacyCardExpand ? 0 : undefined}
          aria-expanded={legacyCardExpand ? expanded : undefined}
        >
          <div className="jcard-datebar jcard-datebar--org">
            <span className="org-chip">
              {school ? (
                <TruongOrgAvatar school={school} size="sm" className="org-chip-avatar" />
              ) : (
                <span className="org-logo" aria-hidden />
              )}
              <span className="org-copy">
                <strong>{school?.ten ?? "Trường"}</strong>
                <OrgBaiDangPublishedDate post={post} />
              </span>
            </span>
            <span className="badge-row">
              {showScheduledUi ? <OrgBaiDangScheduledBadge post={post} /> : null}
              <OrgBaiDangLoaiBadge post={post} />
            </span>
            <TruongBaiDangPostActions post={post} />
          </div>

          {useUnifiedMediaBody ? (
            <>
              <JourneyMilestoneCardBodyContent
                title={post.tieu_de}
                body={post.tom_tat}
                noiDungBlocks={usesBlocks ? blocks : null}
                preview={previewMedia}
                photoGridImages={photoGridImages}
                contentKind={usesBlocks ? cardKind : undefined}
                textPanelExpanded={
                  textPanelCollapsible ? textPanelExpanded : undefined
                }
                onTextPanelExpandedChange={
                  textPanelCollapsible ? setTextPanelExpanded : undefined
                }
                expandTrigger={
                  supportsInlineUnfold
                    ? expanded
                      ? { enabled: false, expanded: true }
                      : {
                          enabled: true,
                          expanded: false,
                          ariaLabel: `Mở bài viết: ${post.tieu_de}`,
                          onClick: onBlocksExpandTrigger,
                          onKeyDown: onBlocksExpandKeyDown,
                        }
                    : undefined
                }
              />

              {showUnfold && usesBlocks && blocks ? (
                <div className="j-m-card-unfold" data-open="true" aria-hidden={false}>
                  <div className="j-m-card-unfold-inner">
                    <div className="cins-editor-page cins-post-view j-m-unfold-post">
                      {isArticleCard ? (
                        <JourneyUnfoldArticleContent
                          blocksOnly
                          title={post.tieu_de}
                          tomTat={post.tom_tat}
                          noiDungHtml={post.noi_dung}
                          coverId={post.cover_id}
                          blocks={blocks}
                        />
                      ) : (
                        <PostBlockRenderer blocks={blocks} />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {showUnfold && !usesBlocks && hasRichBody ? (
                <div className="j-m-card-unfold" data-open="true" aria-hidden={false}>
                  <div className="j-m-card-unfold-inner">
                    <div
                      className="jcard-content article-rich-content article-content-html"
                      dangerouslySetInnerHTML={{ __html: post.noi_dung! }}
                    />
                  </div>
                </div>
              ) : null}

              {showUnfold ? (
                <div className="jcard-actions">
                  <span className="action-spacer" aria-hidden />
                  <button
                    type="button"
                    className="jcard-unfold-toggle"
                    onClick={() => setExpanded(false)}
                    aria-label="Thu gọn"
                  >
                    <ChevronUp size={15} strokeWidth={2.2} aria-hidden />
                    <span>Thu gọn</span>
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="jcard-body org-baidang-body">
              <h3 className="jcard-title org-baidang-title">{post.tieu_de}</h3>

              {!expanded && previewText ? (
                <p className="jcard-excerpt org-baidang-excerpt">{previewText}</p>
              ) : null}

              {expanded && hasRichBody ? (
                <div
                  className="jcard-content article-rich-content article-content-html"
                  dangerouslySetInnerHTML={{ __html: post.noi_dung! }}
                />
              ) : null}

              {expanded && !hasRichBody && previewText ? (
                <p className="jcard-content-plain">{previewText}</p>
              ) : null}

              {!expanded && thumbPreview.previews.length > 0 ? (
                <ul className="org-tl-thumbs" aria-label="Ảnh trong bài">
                  {thumbPreview.previews.map((src) => (
                    <li key={src} className="org-tl-thumb">
                      <span className="org-tl-thumb-frame">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" loading="lazy" decoding="async" />
                      </span>
                    </li>
                  ))}
                  {thumbPreview.overflowLabel ? (
                    <li className="org-tl-thumb org-tl-thumb--more">
                      <span className="org-tl-thumb-more-label">
                        {thumbPreview.overflowLabel}
                      </span>
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {post.tags.length > 0 ? (
                <div className="org-tl-tags">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/nganh-hoc/${encodeURIComponent(tag.slug)}`}
                      className="org-tl-tag"
                    >
                      {tag.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              {legacyCardExpand ? (
                <span className="org-tl-read" aria-hidden>
                  {expanded ? "Thu gọn ↑" : "Xem thêm ↓"}
                </span>
              ) : null}
            </div>
          )}

          <div className="jcard-actions">
            <OrgBaiDangLikeButton postId={post.id} />
            <OrgBaiDangBookmarkButton
              postId={post.id}
              title={post.tieu_de}
              initialSaved={post.viewerBookmarked}
              initialCount={post.bookmarkCount}
            />
            <span className="action-spacer" />
            {showTextPanelUnfold ? (
              <button
                type="button"
                className="jcard-unfold-toggle"
                onClick={() => setTextPanelExpanded(false)}
                aria-label="Thu gọn"
              >
                <ChevronUp size={15} strokeWidth={2.2} aria-hidden />
                <span>Thu gọn</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
