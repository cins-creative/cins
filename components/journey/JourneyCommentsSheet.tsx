"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MemeShapesLoader } from "@/components/cins/MemeShapesLoader";
import { CommentBlock } from "@/components/journey/CommentBlock";
import {
  emitPostCommentsSync,
} from "@/lib/journey/comments-sync-client";
import type {
  MilestonePostComment,
  MilestonePostDetail,
} from "@/lib/journey/milestone-post-types";
import {
  hydrateMilestoneDetailComments,
  invalidateMilestoneDetailCache,
  loadMilestoneDetailCached,
  milestoneDetailCacheKey,
  patchMilestoneDetailComments,
  readCachedMilestoneDetail,
} from "@/lib/journey/milestone-detail-cache";
import {
  CINS_HISTORY_CMT,
  pushOverlayHistory,
  withSearchParam,
} from "@/lib/navigation/overlay-history";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";

import "./journey-comments-sheet.css";

type Props = {
  open: boolean;
  onClose: () => void;
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
  /**
   * Đồng bộ `?cmt=` lên history (mặc định bật).
   * Back đóng sheet thay vì thoát trang.
   */
  syncUrl?: boolean;
};

export function JourneyCommentsSheet({
  open,
  onClose,
  postOwnerSlug,
  postSlug,
  milestoneId,
  syncUrl = true,
}: Props) {
  const titleId = useId();
  const mountedRef = useRef(true);
  const loadGenRef = useRef(0);
  const [portalReady, setPortalReady] = useState(false);
  const pushedRef = useRef(false);
  const ignorePopRef = useRef(false);

  const cacheKey = milestoneDetailCacheKey(
    postOwnerSlug,
    postSlug,
    milestoneId,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MilestonePostDetail | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => setPortalReady(true));
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestClose ổn định theo open/sync
  }, [open, onClose, syncUrl]);

  /** Push `?cmt=` khi mở; popstate / back đóng sheet. */
  useEffect(() => {
    if (!open || !syncUrl) return;

    const current = new URL(window.location.href).searchParams.get("cmt");
    if (current === milestoneId) {
      /* Đã có trên URL (vd. deep-link) — không push thêm. */
      return;
    }

    pushOverlayHistory(
      CINS_HISTORY_CMT,
      milestoneId,
      withSearchParam("cmt", milestoneId),
    );
    pushedRef.current = true;

    return () => {
      /* Parent đóng mà chưa back — để nguyên URL; lần mở sau sẽ so khớp. */
    };
  }, [open, milestoneId, syncUrl]);

  useEffect(() => {
    if (!syncUrl) return;
    const onPop = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        pushedRef.current = false;
        return;
      }
      if (!open) return;
      pushedRef.current = false;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onClose, syncUrl]);

  function requestClose() {
    if (syncUrl && pushedRef.current) {
      ignorePopRef.current = true;
      pushedRef.current = false;
      onClose();
      window.history.back();
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open) {
      loadGenRef.current += 1;
      setLoading(false);
      return;
    }

    const cached = readCachedMilestoneDetail(cacheKey);
    if (cached) {
      setDetail(cached);
      setLoading(cached.comments.length === 0);
      setError(null);
      if (cached.comments.length > 0) return;
      const gen = ++loadGenRef.current;
      void hydrateMilestoneDetailComments(milestoneId)
        .then((comments) => {
          if (!mountedRef.current || gen !== loadGenRef.current) return;
          setDetail({
            ...cached,
            comments,
            social: {
              ...cached.social,
              commentCount: countCommentThreads(comments),
            },
          });
        })
        .catch((e) => {
          if (!mountedRef.current || gen !== loadGenRef.current) return;
          setError(
            e instanceof Error ? e.message : "Không tải được bình luận.",
          );
        })
        .finally(() => {
          if (!mountedRef.current || gen !== loadGenRef.current) return;
          setLoading(false);
        });
      return;
    }

    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    setDetail(null);

    void loadMilestoneDetailCached({
      postOwnerSlug,
      postSlug,
      milestoneId,
      lite: true,
    })
      .then(async (data) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        let next = data;
        if (data.comments.length === 0) {
          const comments = await hydrateMilestoneDetailComments(milestoneId);
          next = {
            ...data,
            comments,
            social: {
              ...data.social,
              commentCount: countCommentThreads(comments),
            },
          };
        }
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(next);
        setError(null);
      })
      .catch((e) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(null);
        setError(
          e instanceof Error ? e.message : "Không tải được bình luận.",
        );
      })
      .finally(() => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setLoading(false);
      });
  }, [open, cacheKey, postOwnerSlug, postSlug, milestoneId]);

  function retry() {
    invalidateMilestoneDetailCache(cacheKey);
    invalidateMilestoneDetailCache(`mid:${milestoneId}`);
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    void loadMilestoneDetailCached({
      postOwnerSlug,
      postSlug,
      milestoneId,
      lite: true,
    })
      .then(async (data) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        let next = data;
        if (data.comments.length === 0) {
          const comments = await hydrateMilestoneDetailComments(milestoneId);
          next = {
            ...data,
            comments,
            social: {
              ...data.social,
              commentCount: countCommentThreads(comments),
            },
          };
        }
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(next);
        setError(null);
      })
      .catch((e) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(null);
        setError(
          e instanceof Error ? e.message : "Không tải được bình luận.",
        );
      })
      .finally(() => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setLoading(false);
      });
  }

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className="j-cmt-sheet-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className="j-cmt-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="j-cmt-sheet-handle" aria-hidden />
        <div className="j-cmt-sheet-head">
          <h2 id={titleId} className="j-cmt-sheet-title">
            Bình luận
          </h2>
          <button
            type="button"
            className="j-cmt-sheet-close"
            aria-label="Đóng"
            onClick={requestClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="j-cmt-sheet-body">
          {loading && !detail ? (
            <div className="j-cmt-sheet-loading" aria-busy="true">
              <MemeShapesLoader size={36} label="Đang tải bình luận" />
              <span>Đang tải…</span>
            </div>
          ) : error ? (
            <div className="j-cmt-sheet-err">
              <p>{error}</p>
              <button type="button" onClick={retry}>
                Thử lại
              </button>
            </div>
          ) : detail ? (
            <SheetCommentPanel detail={detail} />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SheetCommentPanel({ detail }: { detail: MilestonePostDetail }) {
  const milestoneId = detail.milestone.id;
  const [comments, setComments] = useState<MilestonePostComment[]>(
    () => detail.comments,
  );

  useEffect(() => {
    setComments(detail.comments);
  }, [detail]);

  useEffect(() => {
    emitPostCommentsSync(milestoneId, comments);
    patchMilestoneDetailComments(
      milestoneId,
      comments,
      countCommentThreads(comments),
    );
  }, [milestoneId, comments]);

  function apply(
    updater: (list: MilestonePostComment[]) => MilestonePostComment[],
  ) {
    setComments((list) => updater(list));
  }

  return (
    <div className="cins-post-view j-cmt-sheet-comments">
      <CommentBlock
        milestoneId={milestoneId}
        contentOwnerId={detail.owner.id}
        viewerIsOwner={detail.viewerIsOwner}
        comments={comments}
        viewerCanComment={detail.viewerCanComment}
        pinCompose
        sectionId={`post-comments-sheet-${milestoneId}`}
        onCommentAdded={(c) => apply((list) => addCommentToThreads(list, c))}
        onCommentRemoved={(id) =>
          apply((list) => removeCommentFromThreads(list, id))
        }
        onCommentUpdated={(id, patch) =>
          apply((list) => updateCommentInThreads(list, id, patch))
        }
        onThreadsReordered={(threads) => apply(() => threads)}
      />
    </div>
  );
}

/** Mobile sheet: cảm ứng HOẶC viewport hẹp (DevTools / cửa sổ hẹp). */
export function useJourneyCommentsSheetMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 767.98px)");
    const sync = () => setEnabled(coarse.matches || narrow.matches);
    sync();
    coarse.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    return () => {
      coarse.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
    };
  }, []);

  return enabled;
}
