"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PostOverlayCloseContext } from "@/components/journey/post-overlay-close";
import { OrgBaiDangPostSplitBody } from "@/components/truong/OrgBaiDangPostSplitBody";
import {
  lockOverlayPageScroll,
  unlockOverlayPageScroll,
} from "@/lib/navigation/overlay-page-scroll";
import type { OrgBaiDangOverlayOwner } from "@/lib/truong/org-bai-dang-from-milestone";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  /** Bài đang mở. `null` = đóng. */
  post: TruongBaiDang | null;
  onClose(): void;
  owner?: OrgBaiDangOverlayOwner | null;
  /** Showcase lens — chỉ block nội dung. */
  contentOnly?: boolean;
};

/**
 * Overlay chi tiết bài đăng org — cùng shell visual với `PostModalShell`
 * / `JourneyPostModal` (`.j-post-overlay` + `.j-post-sheet`), layout split
 * (nội dung trái · author + bình luận phải).
 */
export function OrgBaiDangPostModal({
  post,
  onClose,
  owner = null,
  contentOnly = false,
}: Props) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [sheetSettled, setSheetSettled] = useState(false);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  useEffect(() => {
    if (post === null) return;
    lockOverlayPageScroll();
    return () => {
      unlockOverlayPageScroll();
    };
  }, [post]);

  useEffect(() => {
    if (post === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [post, onClose]);

  useEffect(() => {
    setSheetSettled(false);
    if (post === null) return;
    const settle = window.setTimeout(() => setSheetSettled(true), 520);
    return () => window.clearTimeout(settle);
  }, [post]);

  useEffect(() => {
    if (post === null) return;
    sheetRef.current?.scrollTo({ top: 0, left: 0 });
  }, [post]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (post === null || portalNode === null) return null;

  return createPortal(
    <div
      className="j-post-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài đăng"
      onClick={handleBackdropClick}
    >
      <article
        className={`j-post-sheet${sheetSettled ? " is-settled" : ""}`}
        ref={sheetRef}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setSheetSettled(true);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PostOverlayCloseContext.Provider value={onClose}>
          <OrgBaiDangPostSplitBody
            key={post.id}
            post={post}
            owner={owner}
            contentOnly={contentOnly}
          />
        </PostOverlayCloseContext.Provider>
      </article>
    </div>,
    portalNode,
  );
}
