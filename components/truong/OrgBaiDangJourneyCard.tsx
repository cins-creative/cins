"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronUp, Megaphone, GraduationCap, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import type { MilestoneMediaItem } from "@/components/journey/milestone-types";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import {
  isMilestoneArticleCard,
  milestoneCardContentKind,
  milestoneCardPhotoGrid,
} from "@/lib/journey/milestone-card-kind";
import { milestoneCardCaptionPlain } from "@/lib/journey/post-media";
import { OrgBaiDangBookmarkButton } from "@/components/truong/OrgBaiDangBookmarkButton";
import { OrgBaiDangLikeButton } from "@/components/truong/OrgBaiDangLikeButton";
import { baiDangUsesBlocks } from "@/lib/truong/bai-dang-blocks";
import { TruongBaiDangPostActions } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";
import {
  loaiBaiDangCssClass,
  loaiBaiDangLabel,
  normalizeLoaiBaiDang,
} from "@/lib/truong/bai-dang";
import {
  baiDangHasExpandableBody,
  buildBaiDangThumbPreview,
  stripHtmlToPlainText,
} from "@/lib/truong/bai-dang-content";
import {
  baiDangCardKind,
  baiDangYear,
  formatBaiDangDate,
} from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
};

const LOAI_ICON = {
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  su_kien: CalendarDays,
  khac: Megaphone,
} as const;

function shouldIgnoreExpandTrigger(target: Element | null): boolean {
  return Boolean(
    target?.closest(
      "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions, .tdh-baidang-edit",
    ),
  );
}

function orgBaiDangPreviewMedia(post: TruongBaiDang): MilestoneMediaItem | null {
  const url = baiDangCoverDisplayUrl(post);
  if (!url) return null;
  return {
    src: url,
    width: 800,
    height: 450,
    label: post.tieu_de,
  };
}

export function OrgBaiDangJourneyCard({ post }: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school;
  const [expanded, setExpanded] = useState(false);

  const lc = loaiBaiDangCssClass(post.loai_bai_dang);
  const loai = normalizeLoaiBaiDang(post.loai_bai_dang);
  const LoaiIcon = LOAI_ICON[loai];
  const usesBlocks = baiDangUsesBlocks(post);
  const blocks = post.noiDungBlocks ?? null;
  const coverUrl = baiDangCoverDisplayUrl(post);
  const canExpand = baiDangHasExpandableBody(post);
  const hasRichBody = Boolean(post.noi_dung?.trim());
  const blocksCardKind = usesBlocks ? milestoneCardContentKind(blocks) : null;
  const cardKind = blocksCardKind ?? baiDangCardKind(post);
  const isArticleBlocks = usesBlocks && isMilestoneArticleCard(blocks);
  const legacyCardExpand = canExpand && !usesBlocks;
  const year = baiDangYear(post.tao_luc);
  const month = post.tao_luc ? new Date(post.tao_luc).getMonth() + 1 : null;
  const dateLabel = formatBaiDangDate(post.tao_luc);
  const showUnfold = isArticleBlocks && expanded;
  const cardCaption = milestoneCardCaptionPlain(post.tom_tat, blocks);

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

  const previewMedia = useMemo(
    () => (usesBlocks ? orgBaiDangPreviewMedia(post) : null),
    [post, usesBlocks],
  );

  function onCardClick(e: React.MouseEvent) {
    if (!legacyCardExpand) return;
    const t = e.target as HTMLElement;
    if (t.closest("a, button")) return;
    setExpanded((v) => !v);
  }

  function onBlocksExpandTrigger(e: React.MouseEvent<HTMLElement>) {
    if (!isArticleBlocks || expanded || shouldIgnoreExpandTrigger(e.target as Element)) {
      return;
    }
    setExpanded(true);
  }

  function onBlocksExpandKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (!isArticleBlocks || expanded) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (shouldIgnoreExpandTrigger(e.target as Element)) return;
    e.preventDefault();
    setExpanded(true);
  }

  const blocksCardClassName = [
    "j-m-card",
    "jcard",
    `jcard--${cardKind}`,
    isArticleBlocks ? "has-unfold" : "",
    showUnfold ? "is-expanded" : isArticleBlocks ? "is-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={`j-milestone j-self org-baidang-milestone${expanded ? " is-card-expanded" : ""}`}
      data-year={year ?? undefined}
      data-month={month ?? undefined}
      data-content-kind={cardKind}
    >
      <div className="j-m-body-wrap">
        <div
          className={
            usesBlocks
              ? blocksCardClassName
              : `j-m-card jcard jcard--${cardKind}${legacyCardExpand ? " is-expandable" : ""}${expanded ? " is-expanded" : legacyCardExpand ? " is-collapsed" : ""}`
          }
          onClick={usesBlocks ? undefined : onCardClick}
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
                {dateLabel ? <small>{dateLabel}</small> : null}
              </span>
            </span>
            <span className="badge-row">
              <span className={`ctx-badge org-tl-type ${lc}`}>
                <LoaiIcon size={11} strokeWidth={1.8} aria-hidden />
                {loaiBaiDangLabel(post.loai_bai_dang)}
              </span>
            </span>
            <TruongBaiDangPostActions post={post} />
          </div>

          {!usesBlocks && coverUrl && cardKind !== "article" ? (
            <div className="jcard-media org-baidang-cover">
              <Image
                src={coverUrl}
                alt=""
                fill
                className="org-baidang-cover-img"
                sizes="(max-width: 820px) 100vw, 760px"
              />
            </div>
          ) : null}

          {usesBlocks ? (
            <>
              <JourneyMilestoneCardBodyContent
                title={post.tieu_de}
                body={post.tom_tat}
                noiDungBlocks={blocks}
                preview={previewMedia}
                photoGridImages={milestoneCardPhotoGrid(blocks)}
                expandTrigger={
                  isArticleBlocks
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

              {showUnfold && blocks ? (
                <div className="j-m-card-unfold" data-open="true" aria-hidden={false}>
                  <div className="j-m-card-unfold-inner">
                    <div className="cins-editor-page cins-post-view j-m-unfold-post editor-canvas">
                      <PostBlockRenderer blocks={blocks} />
                    </div>
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
          </div>
        </div>
      </div>
    </article>
  );
}
