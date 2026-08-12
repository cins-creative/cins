"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { OrgBaiDangPostModal } from "@/components/truong/OrgBaiDangPostModal";
import type { OrgBaiDangOverlayOwner } from "@/lib/truong/org-bai-dang-from-milestone";
import {
  CINS_HISTORY_POST,
  pushOverlayHistory,
  withSearchParam,
} from "@/lib/navigation/overlay-history";
import type { TruongBaiDang } from "@/lib/truong/types";

type OpenOpts = {
  /** Permalink org post — ưu tiên hơn `?orgPost=`. */
  href?: string | null;
  owner?: OrgBaiDangOverlayOwner | null;
};

type Options = {
  owner?: OrgBaiDangOverlayOwner | null;
  contentOnly?: boolean;
};

/**
 * Overlay bài đăng org từ object `TruongBaiDang` (World / Journey tagged /
 * timeline card) — không cần mảng `posts` như lưới org.
 * History: Back đóng overlay.
 */
export function useOrgBaiDangDirectPostOverlay({
  owner: defaultOwner = null,
  contentOnly = false,
}: Options = {}) {
  const [post, setPost] = useState<TruongBaiDang | null>(null);
  const [owner, setOwner] = useState<OrgBaiDangOverlayOwner | null>(
    defaultOwner,
  );
  const pushedRef = useRef(false);
  const ignorePopRef = useRef(false);

  const closePost = useCallback(() => {
    setPost(null);
    if (pushedRef.current) {
      ignorePopRef.current = true;
      pushedRef.current = false;
      window.history.back();
    }
  }, []);

  const openPost = useCallback(
    (next: TruongBaiDang | null | undefined, opts?: OpenOpts) => {
      if (!next?.id?.trim()) return;

      const permalink = opts?.href?.trim() || null;
      const href = permalink
        ? permalink.startsWith("http")
          ? new URL(permalink).pathname + new URL(permalink).search
          : permalink
        : withSearchParam("orgPost", next.id);

      pushOverlayHistory(CINS_HISTORY_POST, next.id, href);
      pushedRef.current = true;
      setOwner(opts?.owner ?? defaultOwner);
      setPost(next);
    },
    [defaultOwner],
  );

  useEffect(() => {
    const onPop = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        pushedRef.current = false;
        return;
      }
      if (!post) return;
      pushedRef.current = false;
      setPost(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [post]);

  const overlay = (
    <OrgBaiDangPostModal
      post={post}
      onClose={closePost}
      owner={owner}
      contentOnly={contentOnly}
    />
  );

  return { openPost, closePost, overlay, activePostId: post?.id ?? null };
}
