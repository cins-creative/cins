"use client";

import { BadgeCheck } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [summary, setSummary] = useState<VerifySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

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

  const show = useCallback(() => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 8, left: rect.right });
    }
    setOpen(true);
    loadSummary();
  }, [loadSummary]);

  const hide = useCallback(() => setOpen(false), []);

  const interactive = Boolean(cotMocId);

  return (
    <span
      ref={badgeRef}
      className={[
        "j-gallery-verified-badge",
        interactive ? "is-interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!interactive}
      tabIndex={interactive ? 0 : undefined}
      aria-describedby={open ? tooltipId : undefined}
      onMouseEnter={interactive ? show : undefined}
      onMouseLeave={interactive ? hide : undefined}
      onFocus={interactive ? show : undefined}
      onBlur={interactive ? hide : undefined}
      onClick={
        interactive
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
    >
      <BadgeCheck size={13} strokeWidth={2.4} />
      {interactive && open && pos ? (
        <span
          className="j-verify-tip"
          role="tooltip"
          id={tooltipId}
          style={{ top: pos.top, left: pos.left }}
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
                  <span className="j-verify-tip-name">
                    {summary.verifier.name}
                  </span>
                  {summary.verifier.role ? (
                    <span className="j-verify-tip-role">
                      {summary.verifier.role}
                    </span>
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
      ) : null}
    </span>
  );
}
