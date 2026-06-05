"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_ACTIVE_MS = 5_000;
const POLL_IDLE_MS = 20_000;

type ProcessingItem = {
  tacPhamId: string;
  bunnyVideoId: string;
};

function dispatchVideoReady(ownerSlug: string) {
  window.dispatchEvent(
    new CustomEvent("cins:journey-timeline-changed", {
      detail: { ownerSlug },
    }),
  );
  window.dispatchEvent(
    new CustomEvent("cins:video-ready", {
      detail: { ownerSlug },
    }),
  );
}

/**
 * Poll Bunny encode cho bài video đang `videoProcessing` — gỡ cờ + refresh
 * timeline + chuông thông báo khi sẵn sàng.
 */
export function BunnyVideoProcessingPoller({
  ownerSlug,
}: {
  ownerSlug: string;
}) {
  const router = useRouter();
  const ownerSlugRef = useRef(ownerSlug);
  ownerSlugRef.current = ownerSlug;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;

      let nextDelay = POLL_IDLE_MS;
      let didComplete = false;

      try {
        const listRes = await fetch("/api/post-video/processing", {
          cache: "no-store",
        });
        if (!listRes.ok || cancelled) return;

        const listJson = (await listRes.json()) as { items?: ProcessingItem[] };
        const items = Array.isArray(listJson.items) ? listJson.items : [];
        if (items.length > 0) nextDelay = POLL_ACTIVE_MS;

        for (const item of items) {
          if (cancelled) return;

          const statusRes = await fetch(
            `/api/post-video/status?videoId=${encodeURIComponent(item.bunnyVideoId)}`,
            { cache: "no-store" },
          );
          if (!statusRes.ok) continue;

          const statusJson = (await statusRes.json()) as { ready?: boolean };
          if (!statusJson.ready) continue;

          const completeRes = await fetch("/api/post-video/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tacPhamId: item.tacPhamId,
              bunnyVideoId: item.bunnyVideoId,
            }),
          });
          if (!completeRes.ok) continue;

          const completeJson = (await completeRes.json()) as {
            ok?: boolean;
            alreadyComplete?: boolean;
          };
          if (!completeJson.ok && !completeJson.alreadyComplete) continue;

          didComplete = true;
          dispatchVideoReady(ownerSlugRef.current);
          router.refresh();
        }
      } catch {
        /* poll lại ở vòng sau */
      } finally {
        if (!cancelled) {
          timer = setTimeout(() => void tick(), didComplete ? 800 : nextDelay);
        }
      }
    }

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return null;
}
