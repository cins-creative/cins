"use client";

import { useCallback, useEffect, useState } from "react";

import type { KetBanStatusSummary, QuanHe } from "@/lib/social/types";

type Pending = {
  id: string;
  resolve: (v: KetBanStatusSummary | null) => void;
};

let queue: Pending[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const inflightById = new Map<string, Promise<KetBanStatusSummary | null>>();

async function flushQueue() {
  flushTimer = null;
  const batch = queue;
  queue = [];
  if (batch.length === 0) return;

  const ids = [...new Set(batch.map((p) => p.id))];
  const byId = new Map<string, KetBanStatusSummary | null>();

  try {
    const qs = new URLSearchParams({ ids: ids.join(",") });
    const res = await fetch(`/api/friends/status?${qs.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as {
        items?: Record<string, KetBanStatusSummary>;
      };
      for (const id of ids) {
        byId.set(id, json.items?.[id] ?? null);
      }
    } else {
      for (const id of ids) byId.set(id, null);
    }
  } catch {
    for (const id of ids) byId.set(id, null);
  }

  for (const p of batch) {
    p.resolve(byId.get(p.id) ?? null);
  }
}

/**
 * Gom các request status trong cùng frame (~32ms) thành 1 GET `?ids=`.
 * @see docs/PLAN_client_cache.md C2
 */
export function fetchKetBanStatus(
  targetUserId: string,
): Promise<KetBanStatusSummary | null> {
  const existing = inflightById.get(targetUserId);
  if (existing) return existing;

  let resolveFn!: (v: KetBanStatusSummary | null) => void;
  const promise = new Promise<KetBanStatusSummary | null>((resolve) => {
    resolveFn = resolve;
  }).finally(() => {
    inflightById.delete(targetUserId);
  });

  inflightById.set(targetUserId, promise);
  queue.push({ id: targetUserId, resolve: resolveFn });
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      void flushQueue();
    }, 32);
  }

  return promise;
}

export function useKetBanStatus(
  targetUserId: string,
  viewerProfileId: string | null,
  initialStatus: KetBanStatusSummary | null = null,
) {
  const [status, setStatus] = useState<KetBanStatusSummary | null>(initialStatus);
  const [ready, setReady] = useState(Boolean(initialStatus));

  const refresh = useCallback(async () => {
    if (!viewerProfileId || viewerProfileId === targetUserId) {
      setStatus(null);
      setReady(true);
      return;
    }

    const next = await fetchKetBanStatus(targetUserId);
    if (next) setStatus(next);
    setReady(true);
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    setStatus(initialStatus);
    setReady(Boolean(initialStatus));
  }, [initialStatus, targetUserId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!viewerProfileId || viewerProfileId === targetUserId) {
        if (!cancelled) {
          setStatus(null);
          setReady(true);
        }
        return;
      }

      const next = await fetchKetBanStatus(targetUserId);
      if (cancelled) return;
      if (next) setStatus(next);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener("cins:notifications-changed", onChanged);
    return () => window.removeEventListener("cins:notifications-changed", onChanged);
  }, [refresh]);

  const quanHe: QuanHe = status?.trang_thai ?? "none";

  return { status, quanHe, ready, refresh, setStatus };
}
