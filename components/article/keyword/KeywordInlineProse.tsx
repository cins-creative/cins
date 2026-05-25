"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TipState = {
  slug: string;
  title: string;
  summary: string;
  thumb: string;
  href: string;
  anchorRect: DOMRect;
};

type Props = {
  html: string;
  className?: string;
};

function KeywordInlineTooltip({
  tip,
  onEnter,
  onLeave,
}: {
  tip: TipState;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const w = 280;
  const margin = 10;
  let left = tip.anchorRect.left + tip.anchorRect.width / 2 - w / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
  const placeBelow = tip.anchorRect.bottom + 8 + 200 < window.innerHeight;
  const top = placeBelow ? tip.anchorRect.bottom + 8 : tip.anchorRect.top - 8;
  const transform = placeBelow ? "translateY(0)" : "translateY(-100%)";

  return createPortal(
    <div
      className={`kw-inline-tip${placeBelow ? "" : " kw-inline-tip--above"}`}
      style={{
        position: "fixed",
        top,
        left,
        width: w,
        transform,
        zIndex: 9999,
      }}
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="kw-inline-tip__head">
        {tip.thumb ? (
          <div className="kw-inline-tip__thumb kw-inline-tip__thumb--has-img">
            <Image src={tip.thumb} alt="" width={40} height={30} unoptimized />
          </div>
        ) : (
          <div className="kw-inline-tip__thumb" aria-hidden>
            KW
          </div>
        )}
        <div>
          <div className="kw-inline-tip__name">{tip.title}</div>
          <div className="kw-inline-tip__kind">Keyword</div>
        </div>
      </div>
      {tip.summary ? <p className="kw-inline-tip__desc">{tip.summary}</p> : null}
      <Link href={tip.href} className="kw-inline-tip__cta">
        Xem bài viết →
      </Link>
    </div>,
    document.body,
  );
}

function kwTarget(node: EventTarget | null): HTMLElement | null {
  if (!node || !(node instanceof HTMLElement)) return null;
  const mark = node.closest<HTMLElement>(".kw-inline-mark[data-kw-slug]");
  if (mark) return mark;
  return node.closest<HTMLElement>(".kw-inline[data-kw-slug]");
}

function readTipData(el: HTMLElement): TipState | null {
  const slug = el.dataset.kwSlug?.trim();
  if (!slug) return null;
  const rect = el.getBoundingClientRect();
  return {
    slug,
    title: el.dataset.kwTitle ?? el.textContent ?? "Keyword",
    summary: el.dataset.kwSummary ?? "",
    thumb: el.dataset.kwThumb ?? "",
    href: el.dataset.kwHref ?? "#",
    anchorRect: rect,
  };
}

export function KeywordInlineProse({ html, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const [mounted, setMounted] = useState(false);
  const hoverSlugRef = useRef<string | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    showTimerRef.current = null;
    hideTimerRef.current = null;
  }, []);

  const closeTip = useCallback(() => {
    hoverSlugRef.current = null;
    setTip(null);
  }, []);

  const scheduleClose = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => closeTip(), 150);
  }, [closeTip]);

  const openTip = useCallback((el: HTMLElement) => {
    const data = readTipData(el);
    if (!data) return;
    hoverSlugRef.current = data.slug;
    setTip(data);
  }, []);

  const scheduleOpen = useCallback(
    (el: HTMLElement) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => openTip(el), 60);
    },
    [openTip],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const canHover = () => window.matchMedia("(hover: hover)").matches;

    const onMouseOver = (e: MouseEvent) => {
      if (!canHover()) return;
      const el = kwTarget(e.target);
      if (!el || !root.contains(el)) return;
      scheduleOpen(el);
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!canHover()) return;
      const from = kwTarget(e.target);
      const to = kwTarget(e.relatedTarget);
      if (!from) return;
      if (to && from.contains(to)) return;
      if (to?.closest(".kw-inline-tip")) return;
      scheduleClose();
    };

    const onClick = (e: MouseEvent) => {
      if (canHover()) return;
      const el = kwTarget(e.target);
      if (!el || !root.contains(el)) return;
      const data = readTipData(el);
      if (!data) return;
      if (hoverSlugRef.current === data.slug && tip) {
        window.location.assign(data.href);
        return;
      }
      e.preventDefault();
      openTip(el);
    };

    root.addEventListener("mouseover", onMouseOver);
    root.addEventListener("mouseout", onMouseOut);
    root.addEventListener("click", onClick);

    return () => {
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseout", onMouseOut);
      root.removeEventListener("click", onClick);
      clearTimers();
    };
  }, [html, scheduleOpen, scheduleClose, openTip, tip, clearTimers]);

  useEffect(() => {
    const onScroll = () => {
      clearTimers();
      closeTip();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [closeTip, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <>
      <div
        ref={rootRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {mounted && tip ? (
        <KeywordInlineTooltip
          tip={tip}
          onEnter={() => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onLeave={scheduleClose}
        />
      ) : null}
    </>
  );
}
