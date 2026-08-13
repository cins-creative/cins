"use client";

import { useEffect } from "react";

import type { NguonSuKien } from "@/lib/social/su-kien-constants";
import { setDefaultNguonSuKien } from "@/lib/social/track-su-kien";

/** Gắn nguồn bề mặt cho event trên trang (gallery / shop hub / tìm kiếm…). */
export function BeMatPageTracker({ nguon }: { nguon: NguonSuKien }) {
  useEffect(() => {
    setDefaultNguonSuKien(nguon);
    return () => setDefaultNguonSuKien(null);
  }, [nguon]);
  return null;
}
