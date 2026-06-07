"use client";

import Link from "next/link";
import { useCallback, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { articlePublicHref } from "@/lib/articles/article-href";
import { getCoverUrl } from "@/lib/articles/cover";
import {
  clientUrlFromThumbnailValue,
  normalizeArticleThumbnailValue,
} from "@/lib/admin/article-display";
import { articleTagLabel, articleTagLoaiClass } from "@/lib/editor/article-tag";
import type { CongDongCategory } from "@/lib/cong-dong/types";
import { useCursorFollowTooltip } from "@/lib/ui/use-cursor-follow-tooltip";

const TIP_MAX_W = 300;
const TIP_EST_H = 340;

function categoryLoaiShort(loai: string): string {
  if (loai === "nganh_dao_tao") return "Ngành";
  return articleTagLabel(loai);
}

function categoryRowMeta(item: CongDongCategory): string {
  return item.linhVucTen?.trim() || categoryLoaiShort(item.loaiBaiViet);
}

function categoryTipKind(item: CongDongCategory): string {
  if (item.loaiBaiViet === "nganh_dao_tao") return "Ngành · Bậc đại học";
  const lv = item.linhVucTen?.trim();
  return lv ? `Nghề · ${lv}` : "Nghề · Vị trí công việc";
}

function categoryTipDesc(item: CongDongCategory): string | null {
  return item.tomTat?.trim() || item.metaDescription?.trim() || null;
}

function categoryTipThumb(item: CongDongCategory): string | null {
  if (item.thumbUrl?.trim()) return item.thumbUrl.trim();
  const thumb = normalizeArticleThumbnailValue(item.thumbnail);
  if (thumb) {
    const fromThumb = clientUrlFromThumbnailValue(thumb);
    if (fromThumb) return fromThumb;
  }
  const cover = item.coverId?.trim();
  if (!cover) return null;
  return getCoverUrl(cover, "thumbnail") ?? getCoverUrl(cover, "public");
}

export function CongDongCategoryRowLink({ item }: { item: CongDongCategory }) {
  const tipId = useId();
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = categoryRowMeta(item);
  const href = articlePublicHref(item.loaiBaiViet, item.slug);
  const desc = categoryTipDesc(item);
  const thumbUrl = categoryTipThumb(item);

  const { tipPos, placeTip, pinTip, onPointerMove, clearTip, cursorFollow } =
    useCursorFollowTooltip({ width: TIP_MAX_W, estHeight: TIP_EST_H });

  const showTip = Boolean(tipPos);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    hoverRef.current = false;
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      if (!hoverRef.current) clearTip();
    }, 180);
  }, [cancelCloseTimer, clearTip]);

  const lockTipForInteraction = useCallback(() => {
    cancelCloseTimer();
    hoverRef.current = true;
    const height = tipRef.current?.offsetHeight;
    pinTip(anchorRef.current, { height, mode: "interactive" });
  }, [cancelCloseTimer, pinTip]);

  const openTip = useCallback(
    (event: React.MouseEvent) => {
      cancelCloseTimer();
      hoverRef.current = true;
      onPointerMove(event.clientX, event.clientY);
      placeTip(anchorRef.current, { follow: true });
    },
    [cancelCloseTimer, onPointerMove, placeTip],
  );

  const leaveRow = useCallback(() => {
    cancelCloseTimer();
    if (showTip) {
      pinTip(anchorRef.current, {
        height: tipRef.current?.offsetHeight,
        mode: "interactive",
      });
    }
    hoverRef.current = false;
    closeTimerRef.current = setTimeout(() => {
      if (!hoverRef.current) clearTip();
    }, 180);
  }, [cancelCloseTimer, clearTip, pinTip, showTip]);

  return (
    <>
      <Link
        ref={anchorRef}
        href={href}
        className="cd-v4-category-row"
        prefetch={false}
        aria-describedby={showTip ? tipId : undefined}
        onMouseEnter={openTip}
        onMouseMove={(event) => onPointerMove(event.clientX, event.clientY)}
        onMouseLeave={leaveRow}
        onFocus={() => {
          hoverRef.current = true;
          placeTip(anchorRef.current);
        }}
        onBlur={scheduleClose}
      >
        <span
          className={`cd-v4-category-row-dot ${articleTagLoaiClass(item.loaiBaiViet)}`}
          aria-hidden
        />
        <span className="cd-v4-category-row-title">{item.tieuDe}</span>
        {meta ? <span className="cd-v4-category-row-meta">{meta}</span> : null}
      </Link>
      {showTip && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              className={
                "cd-v4-category-tip" +
                (cursorFollow() ? " cd-v4-category-tip--follow-cursor" : "")
              }
              role="tooltip"
              style={{ top: tipPos!.top, left: tipPos!.left }}
              onMouseEnter={lockTipForInteraction}
              onMouseLeave={scheduleClose}
            >
              {thumbUrl ? (
                <div className="cd-v4-category-tip-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="cd-v4-category-tip-thumb"
                    src={thumbUrl}
                    alt=""
                    width={300}
                    height={200}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
              <div className="cd-v4-category-tip-body">
                <div className="cd-v4-category-tip-kind">
                  {categoryTipKind(item)}
                </div>
                <div className="cd-v4-category-tip-title">{item.tieuDe}</div>
                {desc ? <p className="cd-v4-category-tip-desc">{desc}</p> : null}
                <Link
                  href={href}
                  className="cd-v4-category-tip-cta"
                  prefetch={false}
                  onClick={(event) => event.stopPropagation()}
                >
                  Xem bài viết
                </Link>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
