"use client";

import { useEffect, useRef, useState } from "react";

export const CH_LIST_LAZY_BATCH = 24;
/** Card shop nặng hơn (avatar/cover/ticker) — batch nhỏ hơn. */
export const CH_LIST_SHOP_LAZY_BATCH = 12;
export const CH_LIST_LAZY_ROOT_MARGIN = "480px 0px";

/**
 * Render danh sách listing theo lô — giảm DOM + ảnh tải cùng lúc khi cuộn.
 * `resetKey` đổi (search / filter / tab) → reset về batch đầu.
 */
export function useChListLazyBatch<T>(
  items: T[],
  resetKey: string,
  batchSize = CH_LIST_LAZY_BATCH,
) {
  const [count, setCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCount(batchSize);
  }, [resetKey, batchSize]);

  useEffect(() => {
    if (count >= items.length) return;

    const el = sentinelRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setCount(items.length);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => Math.min(c + batchSize, items.length));
        }
      },
      { root: null, rootMargin: CH_LIST_LAZY_ROOT_MARGIN, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, items.length, batchSize]);

  return {
    visible: items.slice(0, count),
    sentinelRef,
    hasMore: count < items.length,
  };
}
