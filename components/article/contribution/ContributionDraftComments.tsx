"use client";

import { useCallback, useEffect, useState } from "react";

import { addContributionCommentAction } from "@/components/article/contribution/comment-actions";
import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { JourneyPostCommentsBlock } from "@/components/journey/JourneyPostBody";
import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import {
  addCommentToThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";
import type { TrangThaiDongGop } from "@/lib/article/dong-gop/types";
import { canCommentOnDongGop } from "@/lib/article/dong-gop/comment-model";

type Props = {
  idDongGop: string;
  contentOwnerId: string;
  trangThai: TrangThaiDongGop;
  initialComments: ReadonlyArray<MilestonePostComment>;
  isLoggedIn: boolean;
  isViewerOwn: boolean;
};

/**
 * Bình luận trên bản đóng góp — cùng CommentBlock UI/UX với Journey & trang chủ.
 */
export function ContributionDraftComments({
  idDongGop,
  contentOwnerId,
  trangThai,
  initialComments,
  isLoggedIn,
  isViewerOwn,
}: Props) {
  const authGate = useOptionalAuthGate();
  const [comments, setComments] = useState<MilestonePostComment[]>(() => [
    ...initialComments,
  ]);

  useEffect(() => {
    setComments([...initialComments]);
  }, [initialComments]);

  const viewerCanComment = isLoggedIn && canCommentOnDongGop(trangThai);

  const submitComment = useCallback(
    async (
      text: string,
      replyToId?: string | null,
      anhDinhKem?: string[],
    ) => {
      if (!isLoggedIn) {
        authGate?.openAuthModal(
          "Đăng nhập hoặc tạo tài khoản để bình luận bản đóng góp này.",
        );
        return { ok: false as const, error: "Cần đăng nhập để bình luận." };
      }
      return addContributionCommentAction(idDongGop, text, {
        replyToId,
        anhDinhKem,
      });
    },
    [authGate, idDongGop, isLoggedIn],
  );

  return (
    <div className="contrib-topic-comments">
      <div className="cins-editor-page cins-post-view j-m-unfold-post j-m-unfold-post--comments-only">
        <JourneyPostCommentsBlock
          milestoneId={idDongGop}
          contentOwnerId={contentOwnerId}
          viewerIsOwner={isViewerOwn}
          comments={comments}
          viewerCanComment={viewerCanComment}
          sectionId={`contrib-comments-${idDongGop}`}
          submitComment={submitComment}
          onCommentAdded={(c) =>
            setComments((prev) => addCommentToThreads(prev, c))
          }
          onCommentUpdated={(id, patch) =>
            setComments((prev) => updateCommentInThreads(prev, id, patch))
          }
          onCommentRemoved={(id) =>
            setComments((prev) => removeCommentFromThreads(prev, id))
          }
          onThreadsReordered={setComments}
        />
      </div>
    </div>
  );
}
