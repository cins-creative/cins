"use client";

import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { PostArticleSkeleton } from "@/app/[slug]/p/[postSlug]/_components/PostPage.skeleton";
import { readPostPageCache } from "@/lib/journey/post-local-cache";
import { milestoneContentKind } from "@/lib/journey/post-media";
import { useEffect, useSyncExternalStore } from "react";

type Props = {
  ownerSlug: string;
  postSlug: string;
};

function subscribe() {
  return () => undefined;
}

export function PostPageInstantFallback({ ownerSlug, postSlug }: Props) {
  const cached = useSyncExternalStore(
    subscribe,
    () => readPostPageCache(ownerSlug, postSlug),
    () => null,
  );

  useEffect(() => {
    if (!cached) return;
    const page = document.querySelector(".j-post-page");
    if (!page) return;
    page.setAttribute(
      "data-post-content-kind",
      milestoneContentKind(cached.posts[0]?.noiDungBlocks ?? null),
    );
  }, [cached]);

  if (!cached) return <PostArticleSkeleton />;

  const postSlugFromDb = cached.posts[0]?.slug ?? postSlug;

  return (
    <JourneyPostBody
      initialDetail={cached}
      postSlug={postSlugFromDb}
      isOwner={cached.viewerIsOwner}
      hideOpenLink
      layout="split"
    />
  );
}
