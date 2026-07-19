"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchBanHangClientStatus,
  invalidateBanHangClientCache,
  peekBanHangClientStatus,
} from "@/lib/shop/client-fetch-cache";

export type ShopReadyGateState = {
  loading: boolean;
  enabled: boolean;
  shopReady: boolean;
  shopSetupHref: string | null;
  err: string | null;
  reload: () => void;
};

/**
 * Đọc trạng thái gate Shop từ `/api/user/ban-hang` (có cache RAM ngắn hạn).
 * `shopReady` = đã bật bán + có ≥1 STK nhận tiền.
 */
export function useShopReadyGate(): ShopReadyGateState {
  const peek = peekBanHangClientStatus();
  const [loading, setLoading] = useState(!peek);
  const [enabled, setEnabled] = useState(peek?.enabled ?? false);
  const [shopReady, setShopReady] = useState(peek?.shopReady ?? false);
  const [shopSetupHref, setShopSetupHref] = useState<string | null>(
    peek?.shopSetupHref ?? null,
  );
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    invalidateBanHangClientCache();
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const warm = peekBanHangClientStatus();
      if (!warm) setLoading(true);
      setErr(null);
      try {
        const data = await fetchBanHangClientStatus({ force: !warm });
        if (cancelled) return;
        setEnabled(data.enabled);
        setShopReady(data.shopReady);
        setShopSetupHref(data.shopSetupHref);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Không tải được.");
          setEnabled(false);
          setShopReady(false);
          setShopSetupHref(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const onChanged = () => reload();
    window.addEventListener("cins:ban-hang-changed", onChanged);
    return () => {
      window.removeEventListener("cins:ban-hang-changed", onChanged);
    };
  }, [reload]);

  return { loading, enabled, shopReady, shopSetupHref, err, reload };
}
