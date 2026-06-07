"use client";

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
};

export function JourneyArticleTagLink({ tag, className, onClick }: Props) {
  const tipId = useId();
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const { tipPos, placeTip, onPointerMove, clearTip, cursorFollow } =
    useCursorFollowTooltip({ width: TIP_MAX_W, estHeight: TIP_EST_H });

  const desc = tag.tom_tat?.trim() || null;
  const showTip = Boolean(desc);

  const openTip = useCallback(
    (event: React.MouseEvent) => {
      if (!showTip) return;
      onPointerMove(event.clientX, event.clientY);
      placeTip(anchorRef.current);
    },
    [onPointerMove, placeTip, showTip],
  );

  const linkClass =
    className ?? `tag ${articleTagLoaiClass(tag.loai_bai_viet)}`;

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
        onMouseLeave={clearTip}
        onFocus={() => placeTip(anchorRef.current)}
        onBlur={clearTip}
        aria-describedby={showTip && tipPos ? tipId : undefined}
      >
        #{tag.tieu_de}
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
              onMouseEnter={() => placeTip(anchorRef.current)}
              onMouseLeave={clearTip}
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
