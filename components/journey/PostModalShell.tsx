"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ PostModalShell — overlay client wrapper cho intercepted route.   ║
   ║                                                                  ║
   ║ Khi user click cột mốc trên `/[slug]/journey`:                   ║
   ║   1. Next.js intercept navigation tới `/[slug]/p/[postSlug]`     ║
   ║   2. Render route `@modal/(..)p/[postSlug]/page.tsx` ở slot      ║
   ║      `modal` của journey layout (parallel route).                 ║
   ║   3. Trang journey vẫn render bên dưới (children) → modal đè.    ║
   ║                                                                  ║
   ║ Đóng modal:                                                      ║
   ║   • Click backdrop / nút X / phím Escape → `router.back()`       ║
   ║     để quay lại URL `/[slug]/journey`.                           ║
   ║                                                                  ║
   ║ Refresh / vào thẳng URL `/[slug]/p/[postSlug]` → KHÔNG match     ║
   ║ intercepted route → render trang standalone (`p/[postSlug]/      ║
   ║ page.tsx`). Chia sẻ link, SEO, deep-link đều OK.                 ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export function PostModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  /* Portal target — chỉ resolve sau mount (tránh SSR mismatch). */
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalNode(document.body);
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

  if (portalNode === null) return null;

  return createPortal(
    <div
      className="j-post-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài viết"
      onClick={handleBackdropClick}
      ref={sheetRef}
    >
      <button
        type="button"
        className="j-post-close"
        aria-label="Đóng"
        onClick={handleClose}
      >
        <X size={20} strokeWidth={2} aria-hidden />
      </button>
      <article className="j-post-sheet">{children}</article>
    </div>,
    portalNode,
  );
}
