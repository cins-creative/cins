"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { articlePublicHref } from "@/lib/articles/article-href";
import type { NgheRolePreview } from "@/lib/articles/nghe-role-preview-types";
import { useCursorFollowTooltip } from "@/lib/ui/use-cursor-follow-tooltip";

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

type Props = {
  role: string;
  className?: string;
};

export function AuthorRoleTooltip({ role, className }: Props) {
  const tipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const fetchGenRef = useRef(0);
  const [preview, setPreview] = useState<NgheRolePreview | null>(null);
  const [hasMatch, setHasMatch] = useState<boolean | null>(null);
  const {
    tipPos,
    placeTip,
    pinTip,
    onPointerMove,
    setAnchorHover,
    setTipHover,
    cursorFollow,
  } = useCursorFollowTooltip({
    width: TIP_MAX_W,
    estHeight: TIP_EST_H,
    closeDelayMs: 180,
  });

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

  const revealTip = useCallback(
    (loaded: NgheRolePreview) => {
      if (!anchorRef.current || !hoverRef.current) return;
      setPreview(loaded);
      setHasMatch(true);
      placeTip(anchorRef.current, { follow: true });
    },
    [placeTip],
  );

  const openTip = useCallback(async () => {
    hoverRef.current = true;
    setAnchorHover(true);
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
  }, [preview, revealTip, role, setAnchorHover]);

  const lockTipForInteraction = useCallback(() => {
    hoverRef.current = true;
    setTipHover(true);
    pinTip(anchorRef.current, {
      height: tipRef.current?.offsetHeight,
      mode: "interactive",
    });
  }, [pinTip, setTipHover]);

  const leaveTrigger = useCallback(() => {
    hoverRef.current = false;
    fetchGenRef.current += 1;
    setAnchorHover(false);
  }, [setAnchorHover]);

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
        onMouseEnter={(event) => {
          onPointerMove(event.clientX, event.clientY);
          void openTip();
        }}
        onMouseMove={(event) => onPointerMove(event.clientX, event.clientY)}
        onMouseLeave={leaveTrigger}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        aria-describedby={showTip ? tipId : undefined}
      >
        {displayRole}
      </span>
      {showTip && preview && tipPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              className={
                "j-tag-tip j-nghe-role-tip" +
                (cursorFollow() ? " j-tag-tip--follow-cursor" : "")
              }
              role="tooltip"
              style={{ top: tipPos.top, left: tipPos.left }}
              onMouseEnter={lockTipForInteraction}
              onMouseLeave={() => setTipHover(false)}
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
