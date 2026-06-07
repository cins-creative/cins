"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import {
  invalidateMilestoneDetailCache,
  loadMilestoneDetailCached,
  milestoneDetailCacheKey,
  readCachedMilestoneDetail,
} from "@/lib/journey/milestone-detail-cache";

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
};

export function JourneyMilestoneUnfold({
  postOwnerSlug,
  postSlug,
  milestoneId,
  commentsFocus = false,
  active,
  showBlocks = true,
  showComments = true,
  inlineSkip,
}: Props) {
  const cacheKey = milestoneDetailCacheKey(
    postOwnerSlug,
    postSlug,
    milestoneId,
  );
  const loadGenRef = useRef(0);
  const mountedRef = useRef(true);

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
      setLoading(false);
      return;
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
