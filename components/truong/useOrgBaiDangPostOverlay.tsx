"use client";

import { useCallback, useMemo, useState } from "react";

import { OrgBaiDangPostModal } from "@/components/truong/OrgBaiDangPostModal";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten"
>;

type Options = {
  posts: ReadonlyArray<TruongBaiDang>;
  owner?: OrgOwner | null;
  contentOnly?: boolean;
};

/** Click lưới bài đăng org → overlay kiểu Journey `PostModalShell`. */
export function useOrgBaiDangPostOverlay({
  posts,
  owner = null,
  contentOnly = false,
}: Options) {
  const [postId, setPostId] = useState<string | null>(null);

  const openPost = useCallback((id: string) => {
    const next = id.trim();
    if (!next) return;
    setPostId(next);
  }, []);

  const closePost = useCallback(() => {
    setPostId(null);
  }, []);

  const post = useMemo(() => {
    if (!postId) return null;
    return posts.find((p) => p.id === postId) ?? null;
  }, [posts, postId]);

  const overlay = (
    <OrgBaiDangPostModal
      post={post}
      onClose={closePost}
      owner={owner}
      contentOnly={contentOnly}
    />
  );

  return { openPost, closePost, overlay, activePostId: postId };
}
