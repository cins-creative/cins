"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useRef } from "react";
import { createPortal } from "react-dom";

import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import { articlePublicHref } from "@/lib/articles/article-href";
import { useCursorFollowTooltip } from "@/lib/ui/use-cursor-follow-tooltip";

const TIP_MAX_W = 280;
const TIP_EST_H = 120;

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
  const { tipPos, placeTip, onPointerMove, setAnchorHover, cursorFollow } =
    useCursorFollowTooltip({ width: TIP_MAX_W, estHeight: TIP_EST_H });

  const desc = tag.tom_tat?.trim() || null;
  const showTip = Boolean(desc);

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
                (cursorFollow() ? " j-tag-tip--follow-cursor" : "")
              }
              role="tooltip"
              style={{ top: tipPos.top, left: tipPos.left }}
            >
              <div className="j-tag-tip-kind">{articleTagLabel(tag.loai_bai_viet)}</div>
              <div className="j-tag-tip-title">{tag.tieu_de}</div>
              <p className="j-tag-tip-desc">{desc}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
