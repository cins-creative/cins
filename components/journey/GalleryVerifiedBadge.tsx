"use client";

import { BadgeCheck } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type VerifySummary = {
  count: number;
  verifier: {
    name: string;
    avatarUrl: string | null;
    role: string | null;
    isOrg: boolean;
  } | null;
};

type Props = {
  className?: string;
  /** Cột mốc — fetch thông tin xác thực khi hover. */
  cotMocId?: string | null;
};

export function GalleryVerifiedBadge({ className, cotMocId }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [summary, setSummary] = useState<VerifySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const loadSummary = useCallback(() => {
    if (!cotMocId || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    void fetch(
      `/api/journey/verify-info?cotMocId=${encodeURIComponent(cotMocId)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json: VerifySummary | null) => setSummary(json))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [cotMocId]);

  const updatePosition = useCallback(() => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Neo góc phải badge, mở lên trên — tránh bị overlay card che.
    setPos({ top: rect.top - 8, left: rect.right });
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    cancelHide();
    updatePosition();
    setOpen(true);
    loadSummary();
  }, [cancelHide, loadSummary, updatePosition]);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }, [cancelHide]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => updatePosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePosition]);

  const interactive = Boolean(cotMocId);

  const tooltip =
    interactive && open && pos ? (
      <span
        className="j-verify-tip j-verify-tip--portal"
        role="tooltip"
        id={tooltipId}
        style={{ top: pos.top, left: pos.left }}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {loading ? (
          <span className="j-verify-tip-loading">Đang tải…</span>
        ) : summary?.verifier ? (
          <>
            <span className="j-verify-tip-head">
              <span className="j-verify-tip-avatar" aria-hidden>
                {summary.verifier.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={summary.verifier.avatarUrl} alt="" />
                ) : (
                  <BadgeCheck size={14} strokeWidth={2.4} />
                )}
              </span>
              <span className="j-verify-tip-meta">
                <span className="j-verify-tip-name">{summary.verifier.name}</span>
                {summary.verifier.role ? (
                  <span className="j-verify-tip-role">{summary.verifier.role}</span>
                ) : null}
              </span>
            </span>
            <span className="j-verify-tip-count">
              <BadgeCheck size={12} strokeWidth={2.4} aria-hidden />
              {summary.count > 1
                ? `${summary.count} lượt xác thực`
                : "Đã xác thực"}
            </span>
          </>
        ) : (
          <span className="j-verify-tip-count">
            <BadgeCheck size={12} strokeWidth={2.4} aria-hidden />
            {summary && summary.count > 1
              ? `${summary.count} lượt xác thực`
              : "Đã xác thực"}
          </span>
        )}
      </span>
    ) : null;

  return (
    <>
      <span
        ref={badgeRef}
        className={[
          "j-gallery-verified-badge",
          interactive ? "is-interactive" : "",
          open ? "is-open" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!interactive}
        tabIndex={interactive ? 0 : undefined}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={interactive ? show : undefined}
        onMouseLeave={interactive ? scheduleHide : undefined}
        onFocus={interactive ? show : undefined}
        onBlur={interactive ? scheduleHide : undefined}
        onClick={
          interactive
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
              }
            : undefined
        }
      >
        <BadgeCheck size={11} strokeWidth={2.6} />
      </span>
      {mounted && tooltip ? createPortal(tooltip, document.body) : null}
    </>
  );
}
