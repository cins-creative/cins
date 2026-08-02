"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MemeShapesLoader } from "@/components/cins/MemeShapesLoader";
import {
  hydrateMilestoneDetailComments,
  loadMilestoneDetailCached,
  readCachedMilestoneDetailById,
} from "@/lib/journey/milestone-detail-cache";
import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { countCommentThreads } from "@/lib/social/comments/client-tree";
/* Portal vào document.body — CSS phải đi theo component (trang trường không
   luôn load post-page qua layout parent). Next dedupe import trùng. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

import { JourneyPostBody } from "./JourneyPostBody";

type Props = {
  /** Milestone đang mở. `null` = modal đóng. */
  milestoneId: string | null;
  onClose(): void;
  /** `slide-right` — panel trượt từ phải (vd. admin overlay). */
  variant?: "center" | "slide-right";
  /** z-index cao hơn modal nền khác (vd. bảng quản trị cơ sở). */
  stacked?: boolean;
};

export function JourneyPostModal({
  milestoneId,
  onClose,
  variant = "center",
  stacked = false,
}: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sheetRef = useRef<HTMLElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  useEffect(() => {
    if (milestoneId === null) {
      setDetail(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const cached = readCachedMilestoneDetailById(milestoneId);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      setLoadError(null);
    } else {
      setLoading(true);
      setLoadError(null);
    }

    void loadMilestoneDetailCached({
      milestoneId,
      postOwnerSlug: cached?.owner.slug ?? "",
      postSlug: cached?.posts[0]?.slug ?? null,
      lite: true,
    })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setLoading(false);
        /* Comments hydrate nền — không chặn shell bài dài. */
        if (data.comments.length === 0) {
          void hydrateMilestoneDetailComments(milestoneId)
            .then((comments) => {
              if (cancelled) return;
              setDetail((prev) =>
                prev && prev.milestone.id === milestoneId
                  ? {
                      ...prev,
                      comments,
                      social: {
                        ...prev.social,
                        commentCount: countCommentThreads(comments),
                      },
                    }
                  : prev,
              );
            })
            .catch(() => {
              /* BL lỗi im lặng — user vẫn đọc được bài. */
            });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        if (!cached) {
          setLoadError(
            err instanceof Error ? err.message : "Không tải được bài viết.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [milestoneId]);

  useEffect(() => {
    if (milestoneId === null) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [milestoneId]);

  useEffect(() => {
    if (milestoneId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [milestoneId, onClose]);

  useEffect(() => {
    if (milestoneId === null) return;
    sheetRef.current?.scrollTo({ top: 0, left: 0 });
  }, [milestoneId, detail?.milestone.id, loading]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (milestoneId === null || portalNode === null) return null;

  const postSlug = detail?.posts[0]?.slug ?? null;
  const overlayClass = [
    "j-post-overlay",
    variant === "slide-right" ? "j-post-overlay--slide-right" : "",
    stacked ? "j-post-overlay--stacked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài viết"
      onClick={handleBackdropClick}
    >
      <button
        type="button"
        className="j-post-close"
        aria-label="Đóng"
        onClick={onClose}
      >
        ×
      </button>
      <article
        className="j-post-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !detail ? (
          <div className="j-post-loading" role="status" aria-live="polite">
            <MemeShapesLoader size={36} label="Đang tải nội dung" />
          </div>
        ) : loadError && !detail ? (
          <div className="j-post-err">
            <p>{loadError}</p>
            <button type="button" onClick={onClose} className="j-post-err-btn">
              Đóng
            </button>
          </div>
        ) : detail ? (
          <JourneyPostBody
            initialDetail={detail}
            postSlug={postSlug}
            isOwner={detail.viewerIsOwner}
            hideOpenLink
            layout={variant === "slide-right" ? "stack" : "split"}
            onMilestoneUpdated={() => {
              if (!milestoneId) return;
              void loadMilestoneDetailCached({
                milestoneId,
                postOwnerSlug: detail.owner.slug,
                postSlug: detail.posts[0]?.slug ?? null,
                lite: true,
              }).then((data) => {
                setDetail(data);
                void hydrateMilestoneDetailComments(milestoneId).then(
                  (comments) => {
                    setDetail((prev) =>
                      prev
                        ? {
                            ...prev,
                            comments,
                            social: {
                              ...prev.social,
                              commentCount: countCommentThreads(comments),
                            },
                          }
                        : prev,
                    );
                  },
                );
              });
            }}
          />
        ) : null}
      </article>
    </div>,
    portalNode,
  );
}
