"use client";

import { useCallback, useMemo, useState } from "react";

import { OrgBaiDangPostModal } from "@/components/truong/OrgBaiDangPostModal";
import { blurOverlayFocus } from "@/lib/navigation/overlay-page-scroll";
import type { OrgBaiDangOverlayOwner } from "@/lib/truong/org-bai-dang-from-milestone";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type OrgOwner = OrgBaiDangOverlayOwner | Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug" | "org_loai"
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
    blurOverlayFocus();
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
