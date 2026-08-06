"use client";

import { useEffect, useState } from "react";

const POLL_MS = 5_000;

/** Poll Stream khi block còn cờ `videoProcessing` — hiển thị player ngay khi encode xong. */
export function useVideoProcessingReady(
  processing: boolean,
  videoId: string | null | undefined,
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const id = videoId?.trim() ?? "";
    if (!processing || id.length === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/post-video/status?videoId=${encodeURIComponent(id)}&provider=stream`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          timer = setTimeout(() => void tick(), POLL_MS);
          return;
        }
        const json = (await res.json()) as { ready?: boolean };
        if (json.ready) {
          setReady(true);
          return;
        }
      } catch {
        /* thử lại */
      }
      if (!cancelled) {
        timer = setTimeout(() => void tick(), POLL_MS);
      }
    }

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [processing, videoId]);

  return ready;
}

/** @deprecated Dùng `useVideoProcessingReady`. */
export const useBunnyVideoProcessingReady = useVideoProcessingReady;
