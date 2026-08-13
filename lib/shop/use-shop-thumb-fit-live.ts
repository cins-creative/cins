"use client";

import { useEffect, useState } from "react";

import {
  parseShopThumbFit,
  subscribeShopThumbFit,
  type ShopThumbFit,
} from "@/lib/shop/anh-thumb-fit";

/** Overlay live từ kho — không đợi API kiosk/giỏ refetch. */
export function useShopThumbFitLive(): ReadonlyMap<string, ShopThumbFit> {
  const [map, setMap] = useState<ReadonlyMap<string, ShopThumbFit>>(
    () => new Map(),
  );

  useEffect(() => {
    return subscribeShopThumbFit(({ idSanPham, fit }) => {
      setMap((prev) => {
        if (prev.get(idSanPham) === fit) return prev;
        const next = new Map(prev);
        next.set(idSanPham, fit);
        return next;
      });
    });
  }, []);

  return map;
}

export function resolveLiveThumbFit(
  live: ReadonlyMap<string, ShopThumbFit>,
  idSanPham: string | null | undefined,
  stored: unknown,
): ShopThumbFit {
  if (idSanPham) {
    const fromLive = live.get(idSanPham);
    if (fromLive) return fromLive;
  }
  return parseShopThumbFit(stored);
}
