import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { countCommentThreads } from "@/lib/social/comments/client-tree";

export const POST_COMMENTS_SYNC_EVENT = "cins:post-comments-sync";

/** True khi viewer còn bình luận (hoặc reply) chưa soft-delete trên thread. */
export function viewerHasActiveComment(
  threads: ReadonlyArray<MilestonePostComment>,
): boolean {
  for (const c of threads) {
    if (c.isOwn && !c.daXoa) return true;
    for (const r of c.replies ?? []) {
      if (r.isOwn && !r.daXoa) return true;
    }
  }
  return false;
}

export function emitPostCommentsSync(
  milestoneId: string,
  comments: ReadonlyArray<MilestonePostComment>,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(POST_COMMENTS_SYNC_EVENT, {
      detail: {
        milestoneId,
        count: countCommentThreads(comments),
        viewerCommented: viewerHasActiveComment(comments),
      },
    }),
  );
}
