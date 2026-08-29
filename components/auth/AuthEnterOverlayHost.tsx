"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import dynamic from "next/dynamic";

import { subscribeAuthEnterOverlay } from "@/lib/auth/enter-after-auth";

const LoggedInChromeSkeleton = dynamic(
  () =>
    import("@/components/auth/LoggedInChromeSkeleton").then(
      (m) => m.LoggedInChromeSkeleton,
    ),
  { ssr: false },
);

/**
 * Portal khung trang chủ ngay sau password/OTP — sống qua `router.replace`.
 */
export function AuthEnterOverlayHost() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => subscribeAuthEnterOverlay(setShow), []);

  useEffect(() => {
    if (!show) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [show]);

  if (!mounted || !show) return null;

  return createPortal(
    <div
      className="cins-auth-enter-overlay"
      role="status"
      aria-live="polite"
      aria-label="Đang vào trang chủ"
    >
      <LoggedInChromeSkeleton />
    </div>,
    document.body,
  );
}
