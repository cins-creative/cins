import { Suspense } from "react";

import { PostCommentsClient } from "@/app/[slug]/p/[postSlug]/_components/PostCommentsClient";
import { PostCommentsSkeleton } from "@/app/[slug]/p/[postSlug]/_components/PostPage.skeleton";
import { getCachedPostCommentsForViewer } from "@/lib/journey/post-page-cache";

type Props = {
  milestoneId: string;
  contentOwnerId: string;
  viewerIsOwner: boolean;
  viewerCanComment: boolean;
};

export async function PostCommentsSection({
  milestoneId,
  contentOwnerId,
  viewerIsOwner,
  viewerCanComment,
}: Props) {
  const comments = await getCachedPostCommentsForViewer(milestoneId);

  return (
    <PostCommentsClient
      milestoneId={milestoneId}
      contentOwnerId={contentOwnerId}
      viewerIsOwner={viewerIsOwner}
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
