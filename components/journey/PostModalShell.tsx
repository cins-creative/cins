"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ PostModalShell — overlay client wrapper cho intercepted route.   ║
   ║                                                                  ║
   ║ Đóng modal: click vùng overlay tối / phím Escape → router.back  ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export function PostModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  /* Lock body scroll khi modal mở. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* Escape đóng modal. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  if (!portalReady) return null;

  return createPortal(
    <div
      className="j-post-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài viết"
      onClick={handleBackdropClick}
      ref={sheetRef}
    >
      <article className="j-post-sheet">{children}</article>
    </div>,
    document.body,
  );
}
