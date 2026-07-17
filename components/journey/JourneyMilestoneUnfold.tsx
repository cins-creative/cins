"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { POST_COMMENTS_SYNC_EVENT } from "@/lib/journey/comments-sync-client";
import {
  captureExpandScrollPin,
  subscribeExpandScrollPin,
  type ExpandScrollPin,
} from "@/lib/journey/expand-scroll-pin";
import {
  invalidateMilestoneDetailCache,
  loadMilestoneDetailCached,
  milestoneDetailCacheKey,
  readCachedMilestoneDetail,
} from "@/lib/journey/milestone-detail-cache";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";

type Props = {
  postOwnerSlug: string;
  postSlug?: string | null;
  milestoneId: string;
  commentsFocus?: boolean;
  active: boolean;
  showBlocks?: boolean;
  showComments?: boolean;
  inlineSkip?: {
    byline?: boolean;
    tags?: boolean;
    contributors?: boolean;
  };
  /** Like/bookmark/tag — đặt ngay trên khối bình luận khi mở comments inline. */
  actionsBeforeComments?: ReactNode;
};

function resolveScrollAnchor(from: HTMLElement | null): HTMLElement | null {
  if (!from) return null;
  return from.closest<HTMLElement>(".j-milestone") ?? from;
}

export function JourneyMilestoneUnfold({
  postOwnerSlug,
  postSlug,
  milestoneId,
  commentsFocus = false,
  active,
  showBlocks = true,
  showComments = true,
  inlineSkip,
  actionsBeforeComments,
}: Props) {
  const cacheKey = milestoneDetailCacheKey(
    postOwnerSlug,
    postSlug,
    milestoneId,
  );
  const loadGenRef = useRef(0);
  const mountedRef = useRef(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  /** Snapshot offset card lúc xổ — re-pin khi detail/ảnh đổ vào. */
  const expandScrollPinRef = useRef<ExpandScrollPin | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MilestonePostDetail | null>(() =>
    readCachedMilestoneDetail(cacheKey),
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      expandScrollPinRef.current = null;
      setLoading(false);
      return;
    }
    if (expandScrollPinRef.current == null) {
      expandScrollPinRef.current = captureExpandScrollPin(
        resolveScrollAnchor(rootRef.current),
      );
    }

    const cached = readCachedMilestoneDetail(cacheKey);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);

    void loadMilestoneDetailCached({
      postOwnerSlug,
      postSlug,
      milestoneId,
    })
      .then((data) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(data);
        setError(null);
      })
      .catch((e) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(null);
        setError(
          e instanceof Error ? e.message : "Không tải được nội dung.",
        );
      })
      .finally(() => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setLoading(false);
      });
  }, [active, cacheKey, milestoneId, postOwnerSlug, postSlug]);

  useLayoutEffect(() => {
    if (!active || commentsFocus) return;
    const anchor = resolveScrollAnchor(rootRef.current);
    if (!anchor) return;
    const pin =
      expandScrollPinRef.current ?? captureExpandScrollPin(anchor);
    if (!pin) return;
    expandScrollPinRef.current = pin;
    return subscribeExpandScrollPin(anchor, pin, {
      resizeTarget: rootRef.current ?? anchor,
      holdMs: loading || !detail ? 4000 : 2800,
    });
  }, [active, detail, loading, commentsFocus]);

  useEffect(() => {
    const onComposePublished = (event: Event) => {
      const detail = (event as CustomEvent<ComposePublishedDetail>).detail;
      if (!detail) return;
      const matchesPost =
        detail.postSlug &&
        postSlug &&
        detail.postSlug === postSlug &&
        detail.ownerSlug === postOwnerSlug;
      const matchesMilestone =
        detail.cotMocId != null && detail.cotMocId === milestoneId;
      if (!matchesPost && !matchesMilestone) return;
      invalidateMilestoneDetailCache(cacheKey);
      if (!active) return;
      const gen = ++loadGenRef.current;
      setLoading(true);
      setError(null);
      void loadMilestoneDetailCached({ postOwnerSlug, postSlug, milestoneId })
        .then((data) => {
          if (!mountedRef.current || gen !== loadGenRef.current) return;
          setDetail(data);
          setError(null);
        })
        .catch((e) => {
          if (!mountedRef.current || gen !== loadGenRef.current) return;
          setError(
            e instanceof Error ? e.message : "Không tải được nội dung.",
          );
        })
        .finally(() => {
          if (!mountedRef.current || gen !== loadGenRef.current) return;
          setLoading(false);
        });
    };
    window.addEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
    return () =>
      window.removeEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
  }, [
    active,
    cacheKey,
    milestoneId,
    postOwnerSlug,
    postSlug,
  ]);

  useEffect(() => {
    function onCommentsSync(event: Event) {
      const sync = (
        event as CustomEvent<{
          milestoneId?: string;
          count?: number;
          viewerCommented?: boolean;
        }>
      ).detail;
      if (sync?.milestoneId !== milestoneId || typeof sync.count !== "number") {
        return;
      }
      const nextCount = sync.count;
      const cached = readCachedMilestoneDetail(cacheKey);
      if (cached?.milestone.id === milestoneId) {
        setDetail(cached);
        return;
      }
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              social: {
                ...prev.social,
                commentCount: nextCount,
                ...(typeof sync.viewerCommented === "boolean"
                  ? { viewerCommented: sync.viewerCommented }
                  : {}),
              },
            }
          : prev,
      );
    }

    window.addEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
    return () =>
      window.removeEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
  }, [cacheKey, milestoneId]);

  useEffect(() => {
    if (!active || !commentsFocus || loading || !detail) return;
    const section = document.getElementById(`post-comments-${milestoneId}`);
    if (!section) return;
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [active, commentsFocus, loading, detail, milestoneId]);

  const postSlugFromDb = detail?.posts[0]?.slug ?? postSlug ?? null;

  function retry() {
    invalidateMilestoneDetailCache(cacheKey);
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    void loadMilestoneDetailCached({ postOwnerSlug, postSlug, milestoneId })
      .then((data) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setDetail(data);
        setError(null);
      })
      .catch((e) => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setError(
          e instanceof Error ? e.message : "Không tải được nội dung.",
        );
      })
      .finally(() => {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setLoading(false);
      });
  }

  return (
    <div
      ref={rootRef}
      className="j-m-card-unfold-inner"
      id={`milestone-unfold-${milestoneId}`}
    >
      {loading && !detail ? (
        <div className="j-m-unfold-loading" aria-busy="true">
          <Loader2
            size={20}
            strokeWidth={2}
            className="j-m-unfold-spin"
            aria-hidden
          />
          <span>Đang tải…</span>
        </div>
      ) : error ? (
        <div className="j-m-unfold-err">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Thử lại
          </button>
        </div>
      ) : detail ? (
        <JourneyPostBody
          initialDetail={detail}
          postSlug={postSlugFromDb}
          isOwner={detail.viewerIsOwner}
          hideOpenLink
          variant="inline"
          inlineSkip={inlineSkip}
          inlineParts={{ blocks: showBlocks, comments: showComments }}
          inlineActionsSlot={actionsBeforeComments}
          commentsSectionId={`post-comments-${milestoneId}`}
          onMilestoneUpdated={() => {
            invalidateMilestoneDetailCache(cacheKey);
            retry();
          }}
        />
      ) : null}
    </div>
  );
}
