import { Suspense } from "react";

import { PostCommentsClient } from "@/app/[slug]/p/[postSlug]/_components/PostCommentsClient";
import { PostCommentsSkeleton } from "@/app/[slug]/p/[postSlug]/_components/PostPage.skeleton";
import { getCachedPostCommentsForViewer } from "@/lib/journey/post-page-cache";

type Props = {
  milestoneId: string;
  viewerCanComment: boolean;
};

export async function PostCommentsSection({
  milestoneId,
  viewerCanComment,
}: Props) {
  const comments = await getCachedPostCommentsForViewer(milestoneId);

  return (
    <PostCommentsClient
      milestoneId={milestoneId}
      viewerCanComment={viewerCanComment}
      initialComments={comments}
    />
  );
}

export function PostCommentsSuspense(props: Props) {
  return (
    <Suspense fallback={<PostCommentsSkeleton />}>
      <PostCommentsSection {...props} />
    </Suspense>
  );
}
