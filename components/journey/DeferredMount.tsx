"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Ô giữ chỗ trước khi mount — tránh CLS. */
  minHeight?: number | string;
  /** rootMargin IntersectionObserver — tải sớm hơn mép viewport. */
  rootMargin?: string;
  className?: string;
};

/**
 * Chỉ mount children khi gần viewport — bài dài tránh gắn hàng chục
 * ImageGrid + srcset cùng lúc.
 */
export function DeferredMount({
  children,
  minHeight = 240,
  rootMargin = "400px 0px",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
      }}
      aria-hidden
    />
  );
}
