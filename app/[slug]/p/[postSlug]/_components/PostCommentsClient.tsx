"use client";

import { useEffect, useState } from "react";

import type { MilestonePostComment } from "@/app/[slug]/journey/actions";
import { JourneyPostCommentsBlock } from "@/components/journey/JourneyPostBody";

type Props = {
  milestoneId: string;
  viewerCanComment: boolean;
  initialComments: ReadonlyArray<MilestonePostComment>;
};

export function PostCommentsClient({
  milestoneId,
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
        detail: { milestoneId, count: comments.length },
      }),
    );
  }, [milestoneId, comments.length]);

  return (
    <JourneyPostCommentsBlock
      milestoneId={milestoneId}
      comments={comments}
      viewerCanComment={viewerCanComment}
      onCommentAdded={(c) => setComments((prev) => [...prev, c])}
      onCommentDeleted={(id) =>
        setComments((prev) => prev.filter((c) => c.id !== id))
      }
      onCommentEdited={(id, noiDung) =>
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, noiDung } : c)),
        )
      }
    />
  );
}
