"use client";

import { useCallback, useEffect, useState } from "react";

import type { KetBanStatusSummary, QuanHe } from "@/lib/social/types";

async function fetchKetBanStatus(
  targetUserId: string,
): Promise<KetBanStatusSummary | null> {
  const qs = new URLSearchParams({ id_nguoi: targetUserId });
  const res = await fetch(`/api/ket-ban/status?${qs.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as KetBanStatusSummary;
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
