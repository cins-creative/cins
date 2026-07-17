"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug" | "org_loai"
>;

type Props = {
  /** Bài đang mở. `null` = đóng. */
  post: TruongBaiDang | null;
  onClose(): void;
  owner?: OrgOwner | null;
  /** Showcase lens — chỉ block nội dung. */
  contentOnly?: boolean;
};

/**
 * Overlay chi tiết bài đăng org — cùng shell visual với `PostModalShell`
 * / `JourneyPostModal` (`.j-post-overlay` + `.j-post-sheet`).
 */
export function OrgBaiDangPostModal({
  post,
  onClose,
  owner = null,
  contentOnly = false,
}: Props) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  useEffect(() => {
    if (post === null) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
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
      <button
        type="button"
        className="j-post-close"
        aria-label="Đóng"
        onClick={onClose}
      >
        ×
      </button>
      <article
        className="j-post-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        <OrgBaiDangJourneyCard
          key={post.id}
          post={post}
          owner={owner}
          initialExpanded
          contentOnly={contentOnly}
        />
      </article>
    </div>,
    portalNode,
  );
}
