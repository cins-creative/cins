"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  blurOverlayFocus,
  lockOverlayPageScroll,
  unlockOverlayPageScroll,
} from "@/lib/navigation/overlay-page-scroll";

import { PostOverlayCloseContext } from "./post-overlay-close";

export function PostModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const handleClose = useCallback(() => {
    blurOverlayFocus();
    router.back();
  }, [router]);

  useEffect(() => {
    lockOverlayPageScroll();
    return () => {
      unlockOverlayPageScroll();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  useEffect(() => {
    overlayRef.current?.scrollTo({ top: 0, left: 0 });
  }, [children]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  if (!portalReady) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="j-post-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài viết"
      onClick={handleBackdropClick}
    >
      <article
        className="j-post-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <PostOverlayCloseContext.Provider value={handleClose}>
          {children}
        </PostOverlayCloseContext.Provider>
      </article>
    </div>,
    document.body,
  );
}
