"use client";

import { ChevronDown, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";

import { ContributionCardOwnerActions } from "@/components/article/contribution/ContributionCardOwnerActions";
import { ContributionDraftComments } from "@/components/article/contribution/ContributionDraftComments";
import { ArticleDongGopLeadMirror } from "@/components/article/draft/ArticleDongGopLeadMirror";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import { isComposeSkeletonOrEmpty } from "@/lib/article/compose/skeleton";
import { parseLeadVideoUrl } from "@/lib/articles/lead-video-url";
import {
  relatedTagsByLoai,
  contribTopicTitle,
  type ContribRelatedTag,
} from "@/lib/article/dong-gop/contrib-document";
import { relatedFieldsForLoaiBaiViet } from "@/lib/article/dong-gop/related-fields";
import type { ContributionPublicItem } from "@/lib/article/dong-gop/public-list";
import { getNameInitials } from "@/lib/journey/profile";

import "@/styles/nghe-inline-draft.css";

type Props = {
  item: ContributionPublicItem;
  isLoggedIn: boolean;
  loaiBaiViet: string;
  defaultOpen?: boolean;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function contributorLabel(item: ContributionPublicItem): string {
  const name = item.contributor.tenHienThi;
  const slug = item.contributor.slug;
  if (name && slug) return name;
  if (name) return name;
  if (slug) return `@${slug}`;
  return "Người đóng góp";
}

function topicTitle(item: ContributionPublicItem): string {
  return contribTopicTitle(
    item.hero,
    `Bản của ${contributorLabel(item)}`,
  );
}

export function ContributionTopicCard({
  item,
  isLoggedIn,
  loaiBaiViet,
  defaultOpen = false,
}: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const name = contributorLabel(item);
  const title = topicTitle(item);
  const { hero, thumbnailUrl, bodyHtml } = item;
  const videoReady = Boolean(parseLeadVideoUrl(hero.video_url));
  const body = stripArticleWrapper(bodyHtml).trim();
  const hasBody =
    Boolean(body) && !isComposeSkeletonOrEmpty(body, loaiBaiViet);

  function toggle() {
    setOpen((v) => !v);
  }

  function onHeadKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <li className={`contrib-topic${open ? " is-open" : ""}`}>
      <div
        className="contrib-topic-head"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={onHeadKeyDown}
      >
        <div className="contrib-topic-toggle-main">
          {item.contributor.href ? (
            <Link
              href={item.contributor.href}
              className="contrib-tab-avatar-link"
              onClick={(e) => e.stopPropagation()}
            >
              <ContributorAvatar item={item} />
            </Link>
          ) : (
            <ContributorAvatar item={item} />
          )}
          <div className="contrib-topic-copy">
            <p className="contrib-topic-title">{title}</p>
            <p className="contrib-topic-meta">
              {item.contributor.href ? (
                <Link
                  href={item.contributor.href}
                  className="contrib-topic-author"
                  onClick={(e) => e.stopPropagation()}
                >
                  {name}
                </Link>
              ) : (
                <span className="contrib-topic-author">{name}</span>
              )}
              <span className="contrib-topic-dot" aria-hidden>
                ·
              </span>
              <span>Cập nhật {fmtDate(item.capNhatLuc)}</span>
              {item.isViewerOwn ? (
                <>
                  <span className="contrib-topic-dot" aria-hidden>
                    ·
                  </span>
                  <span>Bản của bạn</span>
                </>
              ) : null}
              {item.soBinhLuan > 0 ? (
                <>
                  <span className="contrib-topic-dot" aria-hidden>
                    ·
                  </span>
                  <span>{item.soBinhLuan} bình luận</span>
                </>
              ) : null}
            </p>
            {!open && item.excerpt ? (
              <p className="contrib-topic-preview">{item.excerpt}</p>
            ) : null}
          </div>
        </div>
        {!open && thumbnailUrl ? (
          <div className="contrib-topic-head-thumb" aria-hidden>
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes="112px"
              unoptimized
            />
          </div>
        ) : null}
        <div className="contrib-topic-toggle-aside">
          {item.daTungLaBaiChinh ? (
            <span
              className="contrib-topic-main-star"
              title="Nội dung chính"
              aria-label="Nội dung chính"
            >
              <Star size={16} strokeWidth={2} fill="currentColor" aria-hidden />
            </span>
          ) : null}
          {item.isHidden ? (
            <span className="contrib-badge contrib-badge--hidden">Đã ẩn</span>
          ) : null}
          <ChevronDown
            className="contrib-topic-chevron"
            size={18}
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
      </div>

      <div
        id={panelId}
        className="contrib-topic-panel"
        hidden={!open}
        role="region"
        aria-label={`Nội dung đóng góp của ${name}`}
      >
        {item.isViewerOwn &&
        item.ghiChuDuyet &&
        (item.trangThai === "tu_choi" || item.trangThai === "can_sua") ? (
          <p className="contrib-tab-curator-note" role="status">
            <strong>Ghi chú từ quản trị viên:</strong> {item.ghiChuDuyet}
          </p>
        ) : null}

        <div className="contrib-topic-article">
          <header
            className={`contrib-topic-hero${thumbnailUrl ? "" : " is-text-only"}`}
          >
            {thumbnailUrl ? (
              <div className="contrib-topic-thumb">
                <Image
                  src={thumbnailUrl}
                  alt=""
                  fill
                  sizes="(max-width: 720px) 100vw, 220px"
                  unoptimized
                />
              </div>
            ) : null}
            <div className="contrib-topic-hero-copy">
              {hero.tieu_de.trim() ? (
                <p className="contrib-topic-kicker">{hero.tieu_de}</p>
              ) : null}
              {hero.tieu_de_viet.trim() || hero.tieu_de_eng.trim() ? (
                <div className="contrib-topic-names">
                  {hero.tieu_de_viet.trim() ? (
                    <h3 className="contrib-topic-name-vi">{hero.tieu_de_viet}</h3>
                  ) : null}
                  {hero.tieu_de_eng.trim() ? (
                    <p className="contrib-topic-name-en">{hero.tieu_de_eng}</p>
                  ) : null}
                </div>
              ) : null}
              {hero.tom_tat.trim() ? (
                <p className="contrib-topic-lead">{hero.tom_tat}</p>
              ) : null}
              <RelatedTagsBlock
                tags={hero.related_tags ?? []}
                loaiBaiViet={loaiBaiViet}
              />
            </div>
          </header>

          {videoReady ? (
            <div className="contrib-topic-video">
              <NgheLeadVideo url={hero.video_url} />
            </div>
          ) : null}

          {hasBody ? (
            <section className="contrib-topic-reading" aria-label="Nội dung chính">
              <ArticleDongGopLeadMirror className="contrib-topic-lead-mirror">
                <div
                  className="nghe-lead-rich article-rich-content article-content-html"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              </ArticleDongGopLeadMirror>
            </section>
          ) : null}
        </div>

        {item.isViewerOwn ? (
          <ContributionCardOwnerActions
            idDongGop={item.id}
            trangThai={item.trangThai}
            isHidden={item.isHidden}
          />
        ) : null}
      </div>

      {/* Luôn hiện — cùng CommentBlock với Journey / trang chủ */}
      <ContributionDraftComments
        idDongGop={item.id}
        contentOwnerId={item.contributor.id}
        trangThai={item.trangThai}
        initialComments={item.comments}
        isLoggedIn={isLoggedIn}
        isViewerOwn={item.isViewerOwn}
      />
    </li>
  );
}

function RelatedTagsBlock({
  tags,
  loaiBaiViet,
}: {
  tags: ContribRelatedTag[];
  loaiBaiViet: string;
}) {
  const groups = relatedFieldsForLoaiBaiViet(loaiBaiViet)
    .map((field) => ({
      ...field,
      items: relatedTagsByLoai(tags, field.loai),
    }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="contrib-topic-related">
      {groups.map((group) => (
        <div key={group.loai} className="contrib-topic-related-group">
          <span className="contrib-topic-related-label">{group.label}</span>
          <ul className="contrib-related-chips">
            {group.items.map((t) => (
              <li key={t.id}>{t.tieu_de}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ContributorAvatar({ item }: { item: ContributionPublicItem }) {
  const avatarUrl = item.contributor.avatarUrl;

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={40}
        height={40}
        className="contrib-tab-avatar"
        unoptimized
      />
    );
  }

  return (
    <span className="contrib-tab-avatar contrib-tab-avatar--fallback">
      {getNameInitials(item.contributor.tenHienThi, item.contributor.slug ?? "")}
    </span>
  );
}
