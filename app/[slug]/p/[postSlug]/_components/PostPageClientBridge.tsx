"use client";

import { useEffect, useMemo, useState } from "react";

import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import {
  isPostPageCacheStale,
  writePostPageCache,
} from "@/lib/journey/post-local-cache";
import { POST_COMMENTS_SYNC_EVENT } from "@/lib/journey/comments-sync-client";
import { milestoneContentKind } from "@/lib/journey/post-media";
import { parseComposeSearchParams } from "@/lib/journey/compose-types";

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
    window.addEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
    return () =>
      window.removeEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
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
      .then((res) =>
        res.ok ? (res.json() as Promise<MilestonePostDetail>) : null,
      )
      .then((fresh) => {
        if (!fresh) return;
        setDetail(fresh);
        setCommentCountOverride(fresh.social.commentCount);
        writePostPageCache(ownerSlug, postSlug, fresh);
      })
      .catch(() => undefined);
  }, [ownerSlug, postSlug]);

  const initialCompose = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : parseComposeSearchParams(new URLSearchParams(window.location.search)),
    [],
  );

  const body = (
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

  if (!isOwner) return body;

  return (
    <JourneyComposeProvider
      ownerId={detail.owner.id}
      ownerSlug={ownerSlug}
      ownerName={detail.owner.tenHienThi}
      ownerAvatarId={detail.owner.avatarId}
      isOwner
      initialCompose={initialCompose}
    >
      <BunnyVideoProcessingPoller ownerSlug={ownerSlug} />
      {body}
    </JourneyComposeProvider>
  );
}
