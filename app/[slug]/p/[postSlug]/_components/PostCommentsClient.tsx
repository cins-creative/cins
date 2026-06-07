"use client";

import { useEffect, useState } from "react";

import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { JourneyPostCommentsBlock } from "@/components/journey/JourneyPostBody";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";

type Props = {
  milestoneId: string;
  contentOwnerId: string;
  viewerIsOwner: boolean;
  viewerCanComment: boolean;
  initialComments: ReadonlyArray<MilestonePostComment>;
};

export function PostCommentsClient({
  milestoneId,
  contentOwnerId,
  viewerIsOwner,
  viewerCanComment,
  initialComments,
}: Props) {
  const [comments, setComments] =
    useState<MilestonePostComment[]>(() => [...initialComments]);

  useEffect(() => {
    setComments([...initialComments]);
  }, [initialComments]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("cins:post-comments-sync", {
        detail: { milestoneId, count: countCommentThreads(comments) },
      }),
    );
  }, [milestoneId, comments]);

  return (
    <JourneyPostCommentsBlock
      milestoneId={milestoneId}
      contentOwnerId={contentOwnerId}
      viewerIsOwner={viewerIsOwner}
      comments={comments}
      viewerCanComment={viewerCanComment}
      onCommentAdded={(c) => setComments((prev) => addCommentToThreads(prev, c))}
      onCommentUpdated={(id, patch) =>
        setComments((prev) => updateCommentInThreads(prev, id, patch))
      }
      onCommentRemoved={(id) =>
        setComments((prev) => removeCommentFromThreads(prev, id))
      }
      onThreadsReordered={setComments}
    />
  );
}
