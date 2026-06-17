import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { countCommentThreads } from "@/lib/social/comments/client-tree";

export const POST_COMMENTS_SYNC_EVENT = "cins:post-comments-sync";

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
      },
    }),
  );
}
