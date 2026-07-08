"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_ACTIVE_MS = 5_000;
const POLL_IDLE_MS = 20_000;

type ProcessingItem = {
  kind?: "tac_pham" | "org_bai_dang";
  tacPhamId?: string;
  orgBaiDangId?: string;
  orgId?: string;
  bunnyVideoId: string;
};

function dispatchVideoReady(ownerSlug: string | null) {
  if (ownerSlug) {
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
  window.dispatchEvent(new CustomEvent("cins:org-baidang-changed"));
}

/**
 * Poll Bunny encode cho bài video đang `videoProcessing` — gỡ cờ + refresh
 * timeline Journey / bài đăng org khi sẵn sàng.
 */
export function BunnyVideoProcessingPoller({
  ownerSlug = null,
  orgId = null,
}: {
  ownerSlug?: string | null;
  orgId?: string | null;
}) {
  const router = useRouter();
  const ownerSlugRef = useRef(ownerSlug);
  ownerSlugRef.current = ownerSlug;
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;

      let nextDelay = POLL_IDLE_MS;
      let didComplete = false;

      try {
        const listUrl = orgIdRef.current
          ? `/api/post-video/processing?orgId=${encodeURIComponent(orgIdRef.current)}`
          : "/api/post-video/processing";
        const listRes = await fetch(listUrl, {
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

          const isOrg =
            item.kind === "org_bai_dang" ||
            Boolean(item.orgBaiDangId && item.orgId);
          const completeBody = isOrg
            ? {
                orgBaiDangId: item.orgBaiDangId,
                orgId: item.orgId,
                bunnyVideoId: item.bunnyVideoId,
              }
            : {
                tacPhamId: item.tacPhamId,
                bunnyVideoId: item.bunnyVideoId,
              };

          const completeRes = await fetch("/api/post-video/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(completeBody),
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
  }, [router, orgId]);

  return null;
}
