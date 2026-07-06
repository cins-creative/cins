"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function PostModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
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
      <button
        type="button"
        className="j-post-close"
        aria-label="Đóng"
        onClick={handleClose}
      >
        ×
      </button>
      <article
        className="j-post-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </article>
    </div>,
    document.body,
  );
}
