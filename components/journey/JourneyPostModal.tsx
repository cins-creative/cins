"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  loadMilestoneDetail,
  type MilestonePostDetail,
} from "@/app/[slug]/journey/actions";
/* Portal vào document.body — CSS phải đi theo component (trang trường không
   luôn load post-page qua layout parent). Next dedupe import trùng. */
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

import { JourneyPostBody } from "./JourneyPostBody";

type Props = {
  /** Milestone đang mở. `null` = modal đóng. */
  milestoneId: string | null;
  onClose(): void;
};

export function JourneyPostModal({ milestoneId, onClose }: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sheetRef = useRef<HTMLElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  useEffect(() => {
    if (milestoneId === null) {
      setDetail(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void loadMilestoneDetail(milestoneId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.data);
      else setLoadError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [milestoneId]);

  useEffect(() => {
    if (milestoneId === null) return;
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
  }, [milestoneId]);

  useEffect(() => {
    if (milestoneId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [milestoneId, onClose]);

  useEffect(() => {
    if (milestoneId === null) return;
    sheetRef.current?.scrollTo({ top: 0, left: 0 });
  }, [milestoneId, detail, loading]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (milestoneId === null || portalNode === null) return null;

  const postSlug = detail?.posts[0]?.slug ?? null;

  return createPortal(
    <div
      className="j-post-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài viết"
      onClick={handleBackdropClick}
    >
      <article
        className="j-post-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="j-post-loading">Đang tải nội dung…</div>
        ) : loadError ? (
          <div className="j-post-err">
            <p>{loadError}</p>
            <button type="button" onClick={onClose} className="j-post-err-btn">
              Đóng
            </button>
          </div>
        ) : detail ? (
          <JourneyPostBody
            initialDetail={detail}
            postSlug={postSlug}
            isOwner={detail.viewerIsOwner}
            hideOpenLink
            layout="split"
            onMilestoneUpdated={() => {
              if (!milestoneId) return;
              void loadMilestoneDetail(milestoneId).then((res) => {
                if (res.ok) setDetail(res.data);
                else onClose();
              });
            }}
          />
        ) : null}
      </article>
    </div>,
    portalNode,
  );
}
