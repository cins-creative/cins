"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { articlePublicHref } from "@/lib/articles/article-href";
import type { NgheRolePreview } from "@/lib/articles/nghe-role-preview-types";

const TIP_MAX_W = 300;
const TIP_EST_H = 280;

const previewCache = new Map<string, NgheRolePreview | null>();
const pendingFetches = new Map<string, Promise<NgheRolePreview | null>>();

function cacheKey(role: string): string {
  return role.trim().toLowerCase();
}

async function loadNgheRolePreview(
  role: string,
): Promise<NgheRolePreview | null> {
  const key = cacheKey(role);
  if (previewCache.has(key)) return previewCache.get(key) ?? null;
  if (pendingFetches.has(key)) return pendingFetches.get(key)!;

  const request = fetch(
    `/api/nghe/role-preview?title=${encodeURIComponent(role.trim())}`,
    { credentials: "same-origin" },
  )
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json()) as { preview?: NgheRolePreview | null };
      const preview = body.preview ?? null;
      previewCache.set(key, preview);
      return preview;
    })
    .catch(() => {
      previewCache.set(key, null);
      return null;
    })
    .finally(() => {
      pendingFetches.delete(key);
    });

  pendingFetches.set(key, request);
  return request;
}

function computeTipPos(node: HTMLElement): { top: number; left: number } {
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
  return { top, left };
}

type Props = {
  role: string;
  className?: string;
};

export function AuthorRoleTooltip({ role, className }: Props) {
  const tipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const hoverRef = useRef(false);
  const fetchGenRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState<NgheRolePreview | null>(null);
  const [hasMatch, setHasMatch] = useState<boolean | null>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const showTip = Boolean(preview && tipPos);

  useEffect(() => {
    let cancelled = false;
    void loadNgheRolePreview(role).then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setPreview(loaded);
        setHasMatch(true);
      } else {
        setHasMatch(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const revealTip = useCallback((loaded: NgheRolePreview) => {
    const node = anchorRef.current;
    if (!node || !hoverRef.current) return;
    setPreview(loaded);
    setHasMatch(true);
    setTipPos(computeTipPos(node));
  }, []);

  const openTip = useCallback(async () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    hoverRef.current = true;
    const gen = ++fetchGenRef.current;

    const cached = previewCache.get(cacheKey(role));
    if (cached) {
      if (cached) revealTip(cached);
      else setHasMatch(false);
      return;
    }

    if (preview) {
      revealTip(preview);
      return;
    }

    const loaded = await loadNgheRolePreview(role);
    if (!hoverRef.current || gen !== fetchGenRef.current) return;

    if (!loaded) {
      setHasMatch(false);
      return;
    }

    revealTip(loaded);
  }, [preview, revealTip, role]);

  const closeTip = useCallback(() => {
    hoverRef.current = false;
    fetchGenRef.current += 1;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (!hoverRef.current) setTipPos(null);
    }, 140);
  }, []);

  const updateTipPos = useCallback(() => {
    const node = anchorRef.current;
    if (!node || !preview) return;
    setTipPos(computeTipPos(node));
  }, [preview]);

  const desc = preview?.tomTat?.trim() || null;
  const displayRole = preview?.roleLabel ?? role;
  const triggerClass =
    (className ?? "author-row-role") +
    (hasMatch ? " j-nghe-role-trigger" : "");

  return (
    <>
      <span
        ref={anchorRef}
        className={triggerClass}
        title={hasMatch ? displayRole : undefined}
        onMouseEnter={() => void openTip()}
        onMouseLeave={closeTip}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        aria-describedby={showTip ? tipId : undefined}
      >
        {displayRole}
      </span>
      {showTip && preview && tipPos && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tipId}
              className="j-tag-tip j-nghe-role-tip"
              role="tooltip"
              style={{ top: tipPos.top, left: tipPos.left }}
              onMouseEnter={() => {
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = null;
                }
                hoverRef.current = true;
                updateTipPos();
              }}
              onMouseLeave={closeTip}
            >
              {preview.thumbUrl ? (
                <div className="j-nghe-role-tip-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="j-nghe-role-tip-thumb"
                    src={preview.thumbUrl}
                    alt=""
                    width={276}
                    height={155}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
              <div className="j-nghe-role-tip-body">
                <div className="j-tag-tip-kind">
                  {preview.linhVucTen ?? "Nghề nghiệp"}
                </div>
                <div className="j-nghe-role-tip-title">{preview.roleLabel}</div>
                {desc ? <p className="j-tag-tip-desc">{desc}</p> : null}
                <Link
                  href={articlePublicHref("nghe", preview.slug)}
                  className="j-nghe-role-tip-cta"
                  prefetch={false}
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
