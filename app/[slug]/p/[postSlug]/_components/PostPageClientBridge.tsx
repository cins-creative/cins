"use client";

import { useEffect, useState } from "react";

import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import {
  isPostPageCacheStale,
  writePostPageCache,
} from "@/lib/journey/post-local-cache";
import { milestoneContentKind } from "@/lib/journey/post-media";

type Props = {
  ownerSlug: string;
  postSlug: string;
  serverDetail: MilestonePostDetail;
  postSlugFromDb: string;
  isOwner: boolean;
  commentsSlot: React.ReactNode;
};

export function PostPageClientBridge({
  ownerSlug,
  postSlug,
  serverDetail,
  postSlugFromDb,
  isOwner,
  commentsSlot,
}: Props) {
  const [detail, setDetail] = useState(serverDetail);
  const [commentCountOverride, setCommentCountOverride] = useState(
    serverDetail.social.commentCount,
  );

  useEffect(() => {
    setDetail(serverDetail);
    setCommentCountOverride(serverDetail.social.commentCount);
    writePostPageCache(ownerSlug, postSlug, serverDetail);
  }, [ownerSlug, postSlug, serverDetail]);

  useEffect(() => {
    function onCommentsSync(event: Event) {
      const custom = event as CustomEvent<{
        milestoneId: string;
        count: number;
      }>;
      if (custom.detail?.milestoneId !== detail.milestone.id) return;
      setCommentCountOverride(custom.detail.count);
    }
    window.addEventListener("cins:post-comments-sync", onCommentsSync);
    return () =>
      window.removeEventListener("cins:post-comments-sync", onCommentsSync);
  }, [detail.milestone.id]);

  useEffect(() => {
    setCommentCountOverride(detail.social.commentCount);
  }, [detail.social.commentCount]);

  useEffect(() => {
    const page = document.querySelector(".j-post-page");
    if (!page) return;
    const kind = milestoneContentKind(detail.posts[0]?.noiDungBlocks ?? null);
    page.setAttribute("data-post-content-kind", kind);
  }, [detail.posts]);

  useEffect(() => {
    if (!isPostPageCacheStale(ownerSlug, postSlug)) return;
    void fetch(
      `/api/journey/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: MilestonePostDetail | null) => {
        if (!fresh) return;
        setDetail(fresh);
        setCommentCountOverride(fresh.social.commentCount);
        writePostPageCache(ownerSlug, postSlug, fresh);
      })
      .catch(() => undefined);
  }, [ownerSlug, postSlug]);

  return (
    <JourneyPostBody
      initialDetail={detail}
      postSlug={postSlugFromDb}
      isOwner={isOwner}
      hideOpenLink
      layout="split"
      commentCountOverride={commentCountOverride}
      commentsSlot={commentsSlot}
    />
  );
}
