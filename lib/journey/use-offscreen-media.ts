"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export type UseOffscreenMediaOptions = {
  /** Bật observer (vd. chỉ khi đang play). Mặc định true. */
  enabled?: boolean;
  /** Tỉ lệ tối thiểu để coi là còn trong khung. Mặc định 0.2. */
  threshold?: number;
  rootMargin?: string;
  /** Gọi khi media rời viewport (một lần mỗi lần rời). */
  onLeave?: () => void;
};

function parseRootMarginPx(rootMargin: string): {
  top: number;
  bottom: number;
} {
  const parts = rootMargin.trim().split(/\s+/);
  const top = Number.parseFloat(parts[0] ?? "0") || 0;
  const bottom =
    Number.parseFloat(parts[2] ?? parts[0] ?? "0") || 0;
  return { top, bottom };
}

function isElementInViewport(
  el: HTMLElement,
  threshold: number,
  rootMargin: string,
): boolean {
  const rect = el.getBoundingClientRect();
  /**
   * ViewportGatedEmbed khi `inView=false` không render children → wrapper cao 0.
   * Nếu parent đã có kích thước (cột media post split), coi như trong khung để
   * mount player — tránh kẹt nền đen mãi (Rive/Lottie không bao giờ load).
   */
  if (rect.width <= 0 || rect.height <= 0) {
    const parent = el.parentElement?.getBoundingClientRect();
    return Boolean(parent && parent.width > 0 && parent.height > 0);
  }

  const { top: marginTop, bottom: marginBottom } =
    parseRootMarginPx(rootMargin);
  const viewTop = -marginTop;
  const viewBottom = window.innerHeight + marginBottom;
  const visibleTop = Math.max(rect.top, viewTop);
  const visibleBottom = Math.min(rect.bottom, viewBottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  return visibleHeight / rect.height >= threshold;
}

/**
 * Theo dõi phần tử media trên feed/timeline.
 * `inView` + `onLeave` — dùng để pause/unload video & iframe khi scroll ra khỏi khung,
 * tránh chồng âm thanh và giữ iframe/player nặng trong bộ nhớ.
 */
export function useOffscreenMedia<T extends HTMLElement = HTMLDivElement>(
  options: UseOffscreenMediaOptions = {},
): { ref: RefObject<T | null>; inView: boolean } {
  const {
    enabled = true,
    threshold = 0.2,
    rootMargin = "0px",
    onLeave,
  } = options;

  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const wasInViewRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled) {
      wasInViewRef.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    const visible = isElementInViewport(el, threshold, rootMargin);
    setInView(visible);
    wasInViewRef.current = visible;
  }, [enabled, threshold, rootMargin]);

  useEffect(() => {
    if (!enabled) {
      wasInViewRef.current = false;
      return;
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      wasInViewRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const box = entry.boundingClientRect;
          const emptyShell = box.width <= 0 || box.height <= 0;
          const parent = (entry.target as HTMLElement).parentElement
            ?.getBoundingClientRect();
          const parentSized = Boolean(
            parent && parent.width > 0 && parent.height > 0,
          );
          // Shell rỗng trong parent đã layout — giữ/mount, đừng unmount vì ratio=0.
          const visible = emptyShell
            ? parentSized
            : entry.isIntersecting && entry.intersectionRatio >= threshold;
          setInView(visible);
          if (wasInViewRef.current && !visible) {
            onLeaveRef.current?.();
          }
          wasInViewRef.current = visible;
        }
      },
      { threshold: [0, threshold, 1], rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, threshold, rootMargin]);

  return { ref, inView };
}
