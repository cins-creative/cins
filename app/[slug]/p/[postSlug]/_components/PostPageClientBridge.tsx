"use client";

import { useEffect, useState } from "react";

import type { MilestonePostDetail } from "@/app/[slug]/journey/actions";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import {
  isPostPageCacheStale,
  writePostPageCache,
} from "@/lib/journey/post-local-cache";

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

  useEffect(() => {
    setDetail(serverDetail);
    writePostPageCache(ownerSlug, postSlug, serverDetail);
  }, [ownerSlug, postSlug, serverDetail]);

  useEffect(() => {
    if (!isPostPageCacheStale(ownerSlug, postSlug)) return;
    void fetch(
      `/api/journey/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(postSlug)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: MilestonePostDetail | null) => {
        if (!fresh) return;
        setDetail(fresh);
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
      commentsSlot={commentsSlot}
    />
  );
}
