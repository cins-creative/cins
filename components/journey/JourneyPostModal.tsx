"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  loadMilestoneDetail,
  type MilestonePostDetail,
} from "@/app/[slug]/journey/actions";

import { JourneyPostBody } from "./JourneyPostBody";

type Props = {
  /** Milestone đang mở. `null` = modal đóng. */
  milestoneId: string | null;
  onClose(): void;
};

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyPostModal — overlay popup hiển thị bài viết chi tiết.     ║
   ║                                                                  ║
   ║ Khi `milestoneId` thay đổi → fetch detail từ server. Hero +      ║
   ║ content + comments được render bởi `JourneyPostBody` (shared     ║
   ║ với page route `/{ownerSlug}/p/{postSlug}`).                     ║
   ║                                                                  ║
   ║ A11y:                                                             ║
   ║  - role="dialog" + aria-modal                                    ║
   ║  - Escape đóng                                                   ║
   ║  - Click backdrop đóng (chỉ khi click ngoài `.j-post-sheet`)     ║
   ║  - Body lock scroll trong khi mở                                 ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export function JourneyPostModal({ milestoneId, onClose }: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  /* Portal target — chỉ resolve sau khi mount (tránh SSR hydration mismatch). */
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  /* Reset state khi đóng → tránh thấy detail cũ vụt qua khi mở milestone khác. */
  useEffect(() => {
    if (milestoneId === null) {
      setDetail(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadMilestoneDetail(milestoneId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.data);
      else setLoadError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [milestoneId]);

  /* Lock body scroll khi mở. */
  useEffect(() => {
    if (milestoneId === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [milestoneId]);

  /* Escape để đóng. */
  useEffect(() => {
    if (milestoneId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [milestoneId, onClose]);

  /* Scroll sheet về top mỗi lần đổi milestone. */
  useEffect(() => {
    if (milestoneId !== null && sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  }, [milestoneId, detail]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (milestoneId === null || portalNode === null) return null;

  /* `postSlug` lấy từ tac_pham đầu tiên (post chính của cột mốc). */
  const postSlug = detail?.posts[0]?.slug ?? null;

  return createPortal(
    <div
      className="j-post-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết cột mốc"
      onClick={handleBackdropClick}
      ref={sheetRef}
    >
      <button
        type="button"
        className="j-post-close"
        aria-label="Đóng"
        onClick={onClose}
      >
        <X size={20} strokeWidth={2} aria-hidden />
      </button>

      <article className="j-post-sheet">
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
            /* Trong modal: vẫn hiển thị link permalink để user có thể mở
               bài viết ở tab riêng/share URL. */
            hideOpenLink={false}
          />
        ) : null}
      </article>
    </div>,
    portalNode,
  );
}
