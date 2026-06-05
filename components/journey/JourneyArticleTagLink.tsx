"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import { articlePublicHref } from "@/lib/articles/article-href";

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
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const desc = tag.tom_tat?.trim() || null;
  const showTip = Boolean(desc);

  const updateTipPos = useCallback(() => {
    const node = anchorRef.current;
    if (!node || !showTip) return;
    const rect = node.getBoundingClientRect();
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - TIP_MAX_W - 12,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= TIP_EST_H + 12
        ? rect.bottom + 8
        : Math.max(12, rect.top - TIP_EST_H - 8);
    setTipPos({ top, left });
  }, [showTip]);

  const openTip = useCallback(() => {
    updateTipPos();
  }, [updateTipPos]);

  const closeTip = useCallback(() => {
    setTipPos(null);
  }, []);

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
        onMouseLeave={closeTip}
        onFocus={openTip}
        onBlur={closeTip}
        aria-describedby={showTip && tipPos ? tipId : undefined}
      >
        #{tag.tieu_de}
      </Link>
      {showTip && tipPos && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tipId}
              className="j-tag-tip"
              role="tooltip"
              style={{ top: tipPos.top, left: tipPos.left }}
              onMouseEnter={openTip}
              onMouseLeave={closeTip}
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
