"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TruongBaiDangPostActions } from "@/components/truong/inline/TruongBaiDangEdit";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";
import { loaiBaiDangCssClass, loaiBaiDangLabel } from "@/lib/truong/bai-dang";
import {
  baiDangHasExpandableBody,
  buildBaiDangThumbPreview,
  stripHtmlToPlainText,
} from "@/lib/truong/bai-dang-content";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
  dateLabel: string | null;
};

export function OrgBaiDangTimelineCard({ post, dateLabel }: Props) {
  const [expanded, setExpanded] = useState(false);

  const lc = loaiBaiDangCssClass(post.loai_bai_dang);
  const coverUrl = baiDangCoverDisplayUrl(post);
  const canExpand = baiDangHasExpandableBody(post);
  const hasRichBody = Boolean(post.noi_dung?.trim());

  const thumbPreview = useMemo(
    () => buildBaiDangThumbPreview(post.noi_dung),
    [post.noi_dung],
  );

  const previewText = useMemo(() => {
    if (post.tom_tat?.trim()) return post.tom_tat.trim();
    if (post.noi_dung?.trim()) {
      const plain = stripHtmlToPlainText(post.noi_dung);
      if (plain) return plain;
    }
    return null;
  }, [post.tom_tat, post.noi_dung]);

  function onCardClick(e: React.MouseEvent) {
    if (!canExpand) return;
    const t = e.target as HTMLElement;
    if (t.closest("a, button")) return;
    setExpanded((v) => !v);
  }

  function onCardKeyDown(e: React.KeyboardEvent) {
    if (!canExpand) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    e.preventDefault();
    setExpanded((v) => !v);
  }

  return (
    <article className="org-tl-item">
      <div className="org-tl-card-stack">
        {coverUrl ? (
          <div className="org-tl-banner">
            <Image
              src={coverUrl}
              alt=""
              fill
              className="org-tl-banner-img"
              sizes="(max-width: 820px) 100vw, 820px"
              priority={false}
            />
            <div className="org-tl-banner-gradient" />
            <span className={`org-tl-banner-label ${lc}`}>
              {loaiBaiDangLabel(post.loai_bai_dang)}
            </span>
          </div>
        ) : null}

        <div
          className={`org-tl-card${expanded ? " is-expanded" : ""}${canExpand ? " is-expandable" : ""}${coverUrl ? " org-tl-card--below-banner" : ""}`}
          onClick={onCardClick}
          onKeyDown={onCardKeyDown}
          role={canExpand ? "button" : undefined}
          tabIndex={canExpand ? 0 : undefined}
          aria-expanded={canExpand ? expanded : undefined}
        >
        <div className="org-tl-body text-only">
          <div className="org-tl-meta">
            <span className={`org-tl-type ${lc}`}>
              {loaiBaiDangLabel(post.loai_bai_dang)}
            </span>
            {dateLabel ? <span className="org-tl-date">{dateLabel}</span> : null}
          </div>

          <div className="org-tl-title-row">
            <h3 className="org-tl-title">{post.tieu_de}</h3>
            <TruongBaiDangPostActions post={post} />
          </div>

          {!expanded && previewText ? (
            <p className="org-tl-excerpt org-tl-excerpt--clamp">{previewText}</p>
          ) : null}

          {expanded && hasRichBody ? (
            <div
              className="org-tl-content article-rich-content article-content-html"
              dangerouslySetInnerHTML={{ __html: post.noi_dung! }}
            />
          ) : null}

          {expanded && !hasRichBody && previewText ? (
            <p className="org-tl-content-plain">{previewText}</p>
          ) : null}

          <div
            className={`org-tl-card-foot${expanded ? " org-tl-card-foot--expanded" : ""}`}
          >
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
                  <li
                    className="org-tl-thumb org-tl-thumb--more"
                    aria-label={`Còn ${thumbPreview.totalImages - thumbPreview.previews.length} ảnh trong bài`}
                  >
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

            {canExpand ? (
              <span className="org-tl-read" aria-hidden>
                {expanded ? "Thu gọn ↑" : "Xem thêm ↓"}
              </span>
            ) : post.tags.length === 0 ? null : (
              <span className="org-tl-read org-tl-read--muted">Chi tiết</span>
            )}
          </div>
        </div>
        </div>
      </div>
    </article>
  );
}
