"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { MemeShapesLoader } from "@/components/cins/MemeShapesLoader";
import { CommentBlock } from "@/components/journey/CommentBlock";
import { addOrgBaiDangCommentAction } from "@/components/truong/org-bai-dang-comment-actions";
import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";
import { viewerHasActiveComment } from "@/lib/journey/comments-sync-client";

type Props = {
  postId: string;
  /** Cập nhật số bình luận + trạng thái đã bình luận lên card. */
  onCountChange?: (count: number, viewerCommented: boolean) => void;
};

export function OrgBaiDangCommentsPanel({ postId, onCountChange }: Props) {
  const authGate = useOptionalAuthGate();
  const isAuthenticated = Boolean(authGate?.isAuthenticated);
  const [comments, setComments] = useState<MilestonePostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/org-posts/${encodeURIComponent(postId)}/comments`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          comments?: MilestonePostComment[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json) {
          setError(json?.error ?? "Không tải được bình luận.");
          return;
        }
        setComments(json.comments ?? []);
      } catch {
        if (!cancelled) setError("Không tải được bình luận.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const syncCount = useCallback((next: ReadonlyArray<MilestonePostComment>) => {
    onCountChangeRef.current?.(
      countCommentThreads(next),
      viewerHasActiveComment(next),
    );
  }, []);

  const update = useCallback(
    (updater: (prev: MilestonePostComment[]) => MilestonePostComment[]) => {
      setComments((prev) => {
        const next = updater(prev);
        syncCount(next);
        return next;
      });
    },
    [syncCount],
  );

  const submitComment = useCallback(
    (
      text: string,
      replyToId?: string | null,
      anhDinhKem?: string[],
      idToChuc?: string | null,
    ) =>
      addOrgBaiDangCommentAction(postId, text, {
        replyToId: replyToId ?? null,
        anhDinhKem,
        idToChuc,
      }),
    [postId],
  );

  return (
    <div
      className="jcard-comments org-baidang-comments cins-editor-page cins-post-view j-m-unfold-post j-m-unfold-post--comments-only"
      onClick={(e) => e.stopPropagation()}
    >
      {loading ? (
        <div className="post-comments-empty" aria-busy="true">
          <MemeShapesLoader size={32} label="Đang tải bình luận" />
          <span>Đang tải bình luận…</span>
        </div>
      ) : error ? (
        <p className="post-comments-err">{error}</p>
      ) : (
        <CommentBlock
          milestoneId={postId}
          contentOwnerId=""
          viewerIsOwner={false}
          comments={comments}
          viewerCanComment={isAuthenticated}
          submitComment={submitComment}
          sectionId={`org-post-comments-${postId}`}
          onCommentAdded={(c) => update((prev) => addCommentToThreads(prev, c))}
          onCommentUpdated={(id, patch) =>
            update((prev) => updateCommentInThreads(prev, id, patch))
          }
          onCommentRemoved={(id) =>
            update((prev) => removeCommentFromThreads(prev, id))
          }
          onThreadsReordered={(threads) => update(() => threads)}
        />
      )}
    </div>
  );
}
