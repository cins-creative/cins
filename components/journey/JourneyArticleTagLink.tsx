"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import { articlePublicHref } from "@/lib/articles/article-href";
import { useCursorFollowTooltip } from "@/lib/ui/use-cursor-follow-tooltip";

const TIP_MAX_W = 260;
const TIP_EST_H_BASE = 88;
/** Khớp `.j-tag-tip-media` aspect-ratio 4/3 @ width 260px */
const TIP_EST_H_MEDIA_EXTRA = 195;

function estimateTagTipHeight(desc: string | null, hasThumb: boolean): number {
  const charsPerLine = 38;
  const lineHeight = 18;
  const descLines = desc ? Math.max(1, Math.ceil(desc.length / charsPerLine)) : 0;
  const textBlock = 52 + descLines * lineHeight;
  const mediaBlock = hasThumb ? TIP_EST_H_MEDIA_EXTRA : 0;
  return Math.min(textBlock + mediaBlock, 420);
}

type Props = {
  tag: ArticleTagRef;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Override nhãn chip (mặc định `#${tag.tieu_de}`). */
  label?: string;
  /** Pill xanh xác thực (post rail). */
  verified?: boolean;
};

export function JourneyArticleTagLink({
  tag,
  className,
  onClick,
  label,
  verified = false,
}: Props) {
  const tipId = useId();
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const desc = tag.tom_tat?.trim() || null;
  const thumbUrl = tag.thumb_url?.trim() || null;
  const showTip = Boolean(desc || thumbUrl);
  const tipEstHeight = useMemo(
    () => estimateTagTipHeight(desc, Boolean(thumbUrl)),
    [desc, thumbUrl],
  );

  const { tipPos, placeTip, onPointerMove, setAnchorHover, cursorFollow } =
    useCursorFollowTooltip({ width: TIP_MAX_W, estHeight: tipEstHeight });

  const openTip = useCallback(
    (event: React.MouseEvent) => {
      if (!showTip) return;
      setAnchorHover(true);
      onPointerMove(event.clientX, event.clientY);
      placeTip(anchorRef.current);
    },
    [onPointerMove, placeTip, setAnchorHover, showTip],
  );

  const linkClass =
    (className ?? `tag ${articleTagLoaiClass(tag.loai_bai_viet)}`) +
    (verified ? " is-verified-tag" : "");
  const chipLabel = label ?? `#${tag.tieu_de}`;

  return (
    <>
      <Link
        ref={anchorRef}
        href={articlePublicHref(tag.loai_bai_viet, tag.slug)}
        className={linkClass}
        prefetch={false}
        onClick={onClick}
        onMouseEnter={openTip}
        onMouseMove={(event) => onPointerMove(event.clientX, event.clientY)}
        onMouseLeave={() => setAnchorHover(false)}
        onFocus={() => {
          setAnchorHover(true);
          placeTip(anchorRef.current);
        }}
        onBlur={() => setAnchorHover(false)}
        aria-describedby={showTip && tipPos ? tipId : undefined}
      >
        {verified ? (
          <Star
            size={12}
            strokeWidth={2}
            fill="currentColor"
            className="post-rail-tag-star"
            aria-hidden
          />
        ) : null}
        {chipLabel}
      </Link>
      {showTip && tipPos && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tipId}
              className={
                "j-tag-tip" +
                (thumbUrl ? " j-tag-tip--media" : "") +
                (cursorFollow() ? " j-tag-tip--follow-cursor" : "")
              }
              role="tooltip"
              style={{ top: tipPos.top, left: tipPos.left }}
            >
              {thumbUrl ? (
                <div className="j-tag-tip-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="j-tag-tip-thumb"
                    src={thumbUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
              <div className={thumbUrl ? "j-tag-tip-body" : undefined}>
                <div className="j-tag-tip-kind">
                  {articleTagLabel(tag.loai_bai_viet)}
                </div>
                <div className="j-tag-tip-title">{tag.tieu_de}</div>
                {desc ? <p className="j-tag-tip-desc">{desc}</p> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
